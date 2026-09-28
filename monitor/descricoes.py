"""Descrição da vaga em seções e o arquivo `descricoes.json`.

Existem duas fontes de texto, e a boa é a primeira:

1. **O HTML da página da vaga** (o `jobUrl` que já está no histórico). A página
   carrega a descrição com a marcação original — `<h2>` de seção, `<li>` de item
   de lista e `<strong>` de subtítulo — dentro de um JSON-LD `JobPosting` ou do
   `__NEXT_DATA__` do Next.js. É esse HTML que permite reproduzir a leitura da
   Gupy (títulos, bullets e subtítulos em negrito).

2. **O texto `description` da API**, que é o mesmo conteúdo já "achatado": os
   títulos viram texto colado no item anterior e a marcação some. Serve de
   reserva quando a página não devolve o HTML (ou quando a empresa usa um
   portal sem esses dados).

O arquivo `descricoes.json` guarda o resultado no formato:

    {"<id da vaga>": {"fonte": "html", "secoes": [
        {"titulo": "Responsabilidades", "blocos": [
            {"tipo": "item", "texto": "Apoiar os processos de compras"},
            {"tipo": "subtitulo", "texto": "Benefícios"}]}]}}

Fica **fora** de `vagas_recentes.json`/`vagas_gerais.json` de propósito: assim o
carregamento inicial do dashboard não cresce, e o `app.js` só baixa esse arquivo
quando o usuário clica em "Ver descrição".
"""

import html as htmllib
import json
import os
import re
import threading
import unicodedata
import urllib.request
from concurrent.futures import ThreadPoolExecutor
from urllib.parse import urlparse

# Os dados ficam na raiz do repositório porque é de lá que o GitHub Pages
# serve o dashboard; este módulo mora em `monitor/`, então sobe um nível.
PASTA_PROJETO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DESCRICOES_FILE = os.path.join(PASTA_PROJETO, "descricoes.json")

# --------------------------------------------------------------------------
# Níveis de cargo descartados
#
# Vagas de sênior, pleno, especialista, gerente (e afins) não entram no
# histórico: o interesse é em vaga de entrada/intermediário. A API da Gupy não
# aceita exclusão (`excludeTerms` é ignorado), então o corte é feito aqui, no
# título da vaga.
#
# A lista é dividida em três porque o título mistura cargo com área, e errar
# para o lado de descartar apaga oportunidade sem a pessoa nunca ver:
#
#   * `NIVEIS` — o cargo em si: "Coordenador de Compras", "Supervisor".
#   * `AREAS`  — a área onde a pessoa vai trabalhar: "Assistente de Coordenação
#     Pedagógica" é vaga de assistente, não de coordenador, então quem tem
#     cargo de entrada no começo do título é preservado.
#   * `PL`     — só conta como nível quando não é "PL/SQL", que é o dialeto
#     de banco.
#
# Tudo com acento ignorado e palavra inteira, senão "Sr" casaria dentro de
# outras palavras.
# --------------------------------------------------------------------------
RE_NIVEIS = re.compile(
    r"\b(?:sr|senior|pleno|especialista|gerente|diretor|coordenador\w*|supervisor\w*|lider\w*)\b",
    re.I,
)
RE_AREAS = re.compile(r"\b(?:coordenacao|supervisao|gerencia|direcao)\b", re.I)
RE_PL = re.compile(r"\bpl\b(?!\s*/\s*sql)", re.I)

# Quem aceita os dois níveis ("Fullstack AI Engineer - (JR/PL)") é mantido,
# porque a empresa admite entry level.
RE_ENTRADA = re.compile(r"\b(?:jr|júnior|junior|trainee|estagiario|estagio|aprendiz)\w*", re.I)
# Cargo de entrada no começo do título: a palavra de nível que vier depois é a
# área, não o cargo.
RE_CARGO_DE_ENTRADA = re.compile(
    r"^(?:assistente|auxiliar|aprendiz|trainee|estagi\w*|operador|atendente|recepcionista|promotor)\b",
    re.I,
)


def _sem_acento(texto: str) -> str:
    return "".join(c for c in unicodedata.normalize("NFD", texto.lower()) if not unicodedata.combining(c))


def cargo_para_descartar(nome: str) -> bool:
    """True quando a vaga é de nível avançado e deve ficar fora do histórico."""
    titulo = _sem_acento(nome or "")
    # Quem aceita os dois níveis ("Fullstack AI Engineer - (JR/PL)") fica.
    if RE_ENTRADA.search(titulo):
        return False
    # Cargo de nível declarado manda, mesmo em título de entrada:
    # "Assistente Sr" é sênior, "Operador de Produção Sênior" também.
    if RE_NIVEIS.search(titulo) or RE_PL.search(titulo):
        return True
    # Sem nível declarado, "Coordenação"/"Supervisão" pode ser só a área:
    # "Assistente de Coordenação Pedagógica" é vaga de assistente.
    return bool(RE_AREAS.search(titulo)) and not RE_CARGO_DE_ENTRADA.match(titulo.strip())

# A página da vaga publica a descrição em HTML no JSON-LD (schema.org
# JobPosting) — é o mesmo HTML que a Gupy renderiza, com <h2>, <li> e <strong>.
# O __NEXT_DATA__ do Next.js também tem uma descrição, mas TRUNCADA (metade do
# texto), então não serve: usá-la apagaria requisitos e benefícios.
RE_JSON_LD = re.compile(
    r'<script[^>]*type=["\']application/ld\+json["\'][^>]*>(.*?)</script>', re.I | re.S
)
RE_TITULO_RESPONSABILIDADES = re.compile(r"responsabilidades", re.I)

# Sentinelas que não parecem tag: se fossem "<h>" seriam apagadas junto com o
# HTML no passo que remove as tags restantes.
MARCA_TITULO = "⟦titulo⟧"
MARCA_SUBTITULO = "⟦subtitulo⟧"
MARCA_ITEM = "⟦item⟧"

# --------------------------------------------------------------------------
# Fonte 1: HTML da página da vaga
# --------------------------------------------------------------------------

# Quantas vezes cada portal já falhou nesta execução. Sem isso, um portal fora do
# ar custaria o timeout em todas as vagas dele — são ~120 vagas novas por dia.
_FALHAS_POR_PORTAL: dict = {}
FALHAS_ANTES_DE_IGNORAR = 2
TIMEOUT_PAGINA = 12

# As páginas das vagas são independentes entre si, então vão em paralelo: são
# ~0,6 s cada uma e uma execução costuma trazer centenas. Com 8 workers o tempo
# cai de ~0,58 s para ~0,07 s por vaga (medido).
TRABALHADORES_PAGINA = 8
_lock_portais = threading.Lock()


def buscar_html_descricao(job_url: str, timeout: int = TIMEOUT_PAGINA) -> str:
    """Devolve a descrição em HTML da página da vaga, ou "" se não houver.

    Só o JSON-LD é usado: os portais que não o publicam (Itaú, Stefanini,
    Atento…) devolvem no `__NEXT_DATA__` só a introduction, e perder o resto
    seria pior do que usar o texto achatado da API.
    """
    if not job_url:
        return ""

    portal = urlparse(job_url).netloc
    with _lock_portais:
        if _FALHAS_POR_PORTAL.get(portal, 0) >= FALHAS_ANTES_DE_IGNORAR:
            return ""

    try:
        req = urllib.request.Request(job_url, headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req, timeout=timeout) as resposta:
            pagina = resposta.read().decode("utf-8", "replace")
    except Exception as err:
        with _lock_portais:
            _FALHAS_POR_PORTAL[portal] = _FALHAS_POR_PORTAL.get(portal, 0) + 1
            cefundiu = _FALHAS_POR_PORTAL[portal] == FALHAS_ANTES_DE_IGNORAR
        if cefundiu:
            print(f"⚠️ {portal} não respondeu ({err}). Vou usar o texto da API nas vagas seguintes dele.")
        return ""

    for bruto in RE_JSON_LD.findall(pagina):
        try:
            dados = json.loads(htmllib.unescape(bruto.strip()))
        except Exception:
            continue
        for objeto in (dados if isinstance(dados, list) else [dados]):
            if isinstance(objeto, dict) and "JobPosting" in str(objeto.get("@type", "")):
                html_descricao = objeto.get("description") or ""
                if isinstance(html_descricao, str) and "<" in html_descricao:
                    return html_descricao

    return ""


def html_para_blocos(html_descricao: str) -> list:
    """Converte o HTML da vaga em [{tipo, texto}], preservando a hierarquia.

    `tipo` é "titulo" (h1-h6), "subtitulo" (strong/b), "item" (li) ou "texto"
    (parágrafo). É essa distinção que faz o painel repetir a leitura da Gupy.
    """
    if not html_descricao:
        return []

    trecho = html_descricao
    for tag in ("h1", "h2", "h3", "h4", "h5", "h6"):
        trecho = re.sub(rf"<{tag}\b[^>]*>", "\n" + MARCA_TITULO, trecho, flags=re.I)
        trecho = re.sub(rf"</{tag}\s*>", "\n", trecho, flags=re.I)
    trecho = re.sub(r"<(strong|b)\b[^>]*>", "\n" + MARCA_SUBTITULO, trecho, flags=re.I)
    trecho = re.sub(r"</(strong|b)\s*>", "\n", trecho, flags=re.I)
    trecho = re.sub(r"<li\b[^>]*>", "\n" + MARCA_ITEM, trecho, flags=re.I)
    trecho = re.sub(r"</li\s*>", "\n", trecho, flags=re.I)
    trecho = re.sub(r"<(p|div|ul|ol|tr|td|th|br|hr)\b[^>]*>", "\n", trecho, flags=re.I)
    trecho = re.sub(r"</(p|div|ul|ol|tr|td|th)\s*>", "\n", trecho, flags=re.I)
    trecho = re.sub(r"<[^>]+>", "", trecho)
    trecho = htmllib.unescape(trecho)

    blocos = []
    for linha in trecho.split("\n"):
        linha = re.sub(r"\s+", " ", linha).strip()
        if not linha:
            continue
        if MARCA_TITULO in linha:
            tipo = "titulo"
        elif MARCA_SUBTITULO in linha:
            tipo = "subtitulo"
        elif MARCA_ITEM in linha:
            tipo = "item"
        else:
            blocos.append({"tipo": "texto", "texto": linha})
            continue
        for parte in re.split("|".join(map(re.escape, (MARCA_TITULO, MARCA_SUBTITULO, MARCA_ITEM))), linha):
            parte = parte.strip()
            if parte:
                blocos.append({"tipo": tipo, "texto": parte})

    return blocos


def extrair_secoes_html(html_descricao: str) -> list:
    """Agrupa os blocos em seções, da de "Responsabilidades" em diante."""
    blocos = html_para_blocos(html_descricao)
    inicio = next(
        (i for i, b in enumerate(blocos)
         if b["tipo"] == "titulo" and RE_TITULO_RESPONSABILIDADES.search(b["texto"])),
        None,
    )
    if inicio is None:
        return []

    secoes = []
    atual = None
    for bloco in blocos[inicio + 1:]:
        if bloco["tipo"] == "titulo":
            atual = {"titulo": bloco["texto"], "blocos": []}
            secoes.append(atual)
        else:
            if atual is None:
                atual = {"titulo": "Responsabilidades", "blocos": []}
                secoes.append(atual)
            atual["blocos"].append(bloco)

    secoes = [{**secao, "titulo": _titulo_padrao(secao["titulo"])} for secao in secoes]
    return [secao for secao in secoes if secao["blocos"]]


# --------------------------------------------------------------------------
# Fonte 2: texto achatado da API (reserva)
# --------------------------------------------------------------------------

# O cabeçalho só vale quando não está no meio de uma frase: rejeita "suas
# responsabilidades." e "…responsabilidadesTRACE". Aceita o que vier depois
# (maiúscula, número, emoji, marcador), porque o texto vem colado.
RE_INICIO = re.compile(
    r"(?<![a-zà-ú] )"
    r"(?:Principais\s+)?[Rr]esponsabilidades"
    r"(?:\s*(?:e|&)\s*[Aa]tribui(?:ç(?:õ|o)?(?:es|e)|ções))?"
    r"\s*[:\-–]?\s*"
    r"(?![ ]*[a-zà-ú])",
    re.U,
)

# Títulos que dividem o texto achatado. Só valem depois de pontuação ou de
# "&nbsp;" — é assim que a API cola as seções. A forma colada no meio da
# palavra ("…domingosBenefícios") é ignorada de propósito: cortá-la errada parte
# um item ao meio, ignorá-la só deixa o conteúdo na seção anterior.
RE_SECAO = re.compile(
    r"(?<![A-Za-zÀ-ú0-9])"
    r"(?:Requisitos(?:\s+e\s+[Qq]ualifica(?:ç(?:õ|o)?(?:es|e)))?"
    r"|Qualifica(?:ç(?:õ|o)?(?:es|e)|ções)"
    r"|Informa(?:ç(?:õ|o)?es\s+(?:adicionais|complementares))"
    r"|Benef(?:í|i)cios"
    r"|Sal(?:á|a)rio|Remunera(?:ç|c)(?:ão|ao)"
    r"|Jornada\s+de\s+trabalho|Horário(?:s)?\s+de\s+trabalho"
    r"|Local\s+de\s+[Tt]rabalho|Endere(?:ç|c)o"
    r"|Education|Requirements|Qualifications|Benefits)"
    r"(?:\s*:?\s*\n"
    r"|\s*:?\s*(?=\s*(?:&nbsp;)*\s*(?:[A-ZÀ-Ú0-9•➢▪◦‣·∙»➜→])|&\w+;)"
    r"|\s*:\s*)",
    re.U,
)

# ";" sempre separa. Ponto final e quebra de linha só quando vem maiúscula
# depois. A barra na frente do ponto evita o corte errado de "Java/.NET".
RE_SEPARADORES = re.compile(
    r";+|[•➢▪◦‣·∙]|➜|→|»"
    r"|(?<=[.!?])(?<!/)\s*(?=[A-ZÀ-Ú])"
    r"|\n\s*(?=[A-ZÀ-Ú•➢▪])"
)
RE_ENTIDADES = {
    "&nbsp;": "\u00a0",
    "&amp;": "&",
    "&quot;": '"',
    "&apos;": "'",
    "&#39;": "'",
    "&lt;": "<",
    "&gt;": ">",
}
TERMINAL = ".!?;:"
MIN_CARACTERES_ITEM = 3
TITULO_RESPONSABILIDADES = "Responsabilidades"

# Rótulo mostrado no painel, por cabeçalho encontrado (chave sem acento porque a
# API traz as duas formas).
TITULOS = {
    "requisitos": "Requisitos",
    "requisitos e qualificacoes": "Requisitos",
    "qualificacoes": "Requisitos",
    "requirements": "Requisitos",
    "qualifications": "Requisitos",
    "education": "Requisitos",
    "informacoes adicionais": "Informações adicionais",
    "informacoes complementares": "Informações adicionais",
    "beneficios": "Benefícios",
    "benefits": "Benefícios",
    "salario": "Salário",
    "remuneracao": "Salário",
    "jornada de trabalho": "Jornada de trabalho",
    "horario de trabalho": "Jornada de trabalho",
    "horarios de trabalho": "Jornada de trabalho",
    "local de trabalho": "Local de trabalho",
    "endereco": "Local de trabalho",
}


def _normalizar(texto: str) -> str:
    return re.sub(r"\s+", " ", texto).strip(" \t:;-–—•➢")


def _sem_acento(texto: str) -> str:
    return "".join(c for c in unicodedata.normalize("NFD", texto.lower()) if not unicodedata.combining(c))


def _titulo_padrao(titulo: str) -> str:
    """Reduz o título da seção ao rótulo único usado no painel."""
    limpo = _normalizar(titulo).rstrip(":")
    return TITULOS.get(_sem_acento(limpo), limpo or TITULO_RESPONSABILIDADES)


def _quebrar_itens(trecho: str) -> list:
    """Divide um trecho achatado nos itens da lista."""
    trecho = re.sub(r"<[^>]+>", " ", trecho)
    for entidade, caractere in RE_ENTIDADES.items():
        trecho = trecho.replace(entidade, caractere)

    itens = []
    for bloco in RE_SEPARADORES.split(trecho):
        item = ""
        for parte in re.split(r"[\n\r]+|\u00a0", bloco):
            parte = _normalizar(parte)
            if len(parte) < MIN_CARACTERES_ITEM:
                continue
            # Recolla o que o "&nbsp;" ou o achatamento cortou no meio da frase.
            if item and (len(item) < 25 or item[-1] not in TERMINAL):
                item = f"{item} {parte}"
            else:
                if item:
                    itens.append(item)
                item = parte
        if item:
            itens.append(item)

    return itens


def extrair_secoes_texto(description: str) -> list:
    """Organiza o texto achatado da API em seções (uso de reserva)."""
    if not description:
        return []

    inicio = RE_INICIO.search(description)
    if not inicio:
        return []

    trecho = description[inicio.end():]
    # Quebra de linha seguida de minúscula é continuação de frase, não item novo.
    trecho = re.sub(r"\n\s*(?=[a-zà-ú])", " ", trecho)

    # (onde a seção termina, onde o conteúdo começa, título)
    marcas = [(0, 0, TITULO_RESPONSABILIDADES)]
    for corte in RE_SECAO.finditer(trecho):
        marcas.append((corte.start(), corte.end(), _titulo_padrao(corte.group(0))))

    secoes = []
    for indice, (_, inicio_conteudo, titulo) in enumerate(marcas):
        fim = marcas[indice + 1][0] if indice + 1 < len(marcas) else len(trecho)
        itens = _quebrar_itens(trecho[inicio_conteudo:fim])
        if not itens:
            continue
        if secoes and secoes[-1]["titulo"] == titulo:
            secoes[-1]["blocos"].extend({"tipo": "item", "texto": item} for item in itens)
        else:
            secoes.append({
                "titulo": titulo,
                "blocos": [{"tipo": "item", "texto": item} for item in itens],
            })

    return secoes


# --------------------------------------------------------------------------
# As duas fontes juntas
# --------------------------------------------------------------------------

def descrever_vaga(job_url: str = "", description: str = "", timeout: int = TIMEOUT_PAGINA) -> dict:
    """Monta a descrição de uma vaga, preferindo o HTML da página ao texto da API."""
    if job_url:
        html_descricao = buscar_html_descricao(job_url, timeout=timeout)
        if html_descricao:
            secoes = extrair_secoes_html(html_descricao)
            if secoes:
                return {"fonte": "html", "secoes": secoes}

    return {"fonte": "texto", "secoes": extrair_secoes_texto(description)}


def descrever_vagas(vagas: list) -> dict:
    """Descreve um lote de vagas em paralelo e devolve {id: {fonte, secoes}}.

    Cada vaga é uma requisição independente (a página do portal), então o gargalo
    é latência, não CPU. Sem paralelismo, 600 vagas custariam ~6 min só nisso.
    """
    if not vagas:
        return {}

    def _trabalhar(vaga):
        return str(vaga.get("id", "")), descrever_vaga(
            job_url=vaga.get("jobUrl", ""),
            description=vaga.get("description", ""),
        )

    if len(vagas) == 1:
        return dict([_trabalhar(vagas[0])])

    with ThreadPoolExecutor(max_workers=min(TRABALHADORES_PAGINA, len(vagas))) as pool:
        return dict(pool.map(_trabalhar, vagas))


def carregar_descricoes(descricoes_file: str = DESCRICOES_FILE) -> dict:
    """Lê o mapa {id: {fonte, secoes}}. Arquivo ausente/corrompido vira vazio."""
    if not os.path.exists(descricoes_file):
        return {}

    try:
        with open(descricoes_file, "r", encoding="utf-8") as arquivo:
            conteudo = arquivo.read().strip()
        dados = json.loads(conteudo) if conteudo else {}
        return dados if isinstance(dados, dict) else {}
    except Exception as err:
        print(f"⚠️ Erro ao ler {descricoes_file}: {err}. Recomeçando sem descrições.")
        return {}


def salvar_descricoes(descricoes: dict, descricoes_file: str = DESCRICOES_FILE):
    """Grava o mapa {id: {fonte, secoes}} no arquivo de descrições."""
    try:
        with open(descricoes_file, "w", encoding="utf-8") as arquivo:
            json.dump(descricoes, arquivo, indent=2, ensure_ascii=False)
    except Exception as err:
        print(f"❌ Erro ao salvar {descricoes_file}: {err}")


def sincronizar_descricoes(ids_no_historico: set, descricoes_novas: dict, descricoes_file: str = DESCRICOES_FILE):
    """Atualiza o arquivo de descrições e apaga o que saiu do histórico.

    `ids_no_historico` são os IDs das vagas que continuam em `vagas_recentes.json`/
    `vagas_gerais.json` (a retenção é de 7 dias); `descricoes_novas` são as
    descrições das vagas recém-chegadas. Sem o corte, o arquivo cresceria para
    sempre, já que uma vaga lida uma vez não volta da API.
    """
    descricoes = carregar_descricoes(descricoes_file)
    for vaga_id, entrada in descricoes_novas.items():
        if entrada.get("secoes"):
            descricoes[str(vaga_id)] = entrada
    for vaga_id in list(descricoes):
        if vaga_id not in ids_no_historico:
            del descricoes[vaga_id]
    salvar_descricoes(descricoes, descricoes_file)
    return descricoes
