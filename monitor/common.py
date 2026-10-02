import json
import os
import time
import urllib.request
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

from descricoes import (
    cargo_para_descartar,
    descrever_vagas,
    estagio_fora_do_escopo,
    sincronizar_descricoes,
)

# Os dados ficam em `data/` porque é de lá que o `assets/app.js` os busca; o
# site (index.html) fica na raiz, que é o que o GitHub Pages serve. Este módulo
# mora em `monitor/`, então sobe dois níveis.
PASTA_PROJETO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PASTA_DADOS = os.path.join(PASTA_PROJETO, "data")

# Fuso Horário de Brasília
FUSO_SP = ZoneInfo("America/Sao_Paulo")
CACHE_FILE_DEFAULT = os.path.join(PASTA_DADOS, "vagas_vistas.json")
VAGAS_RECENTES_FILE_DEFAULT = os.path.join(PASTA_DADOS, "vagas_recentes.json")
VAGAS_GERAIS_FILE_DEFAULT = os.path.join(PASTA_DADOS, "vagas_gerais.json")
# Arquivo de auditoria: as vagas que os filtros cortaram. Vai à parte por dois
# motivos — o histórico é o que o dashboard mostra, e este é o que a pessoa
# consulta quando desconfia do corte.
VAGAS_DESCARTADAS_FILE_DEFAULT = os.path.join(PASTA_DADOS, "vagas_descartadas.json")
MAX_DIAS_PUBLICACAO_DEFAULT = 4
DIAS_RETENCAO_CACHE_DEFAULT = 7


def carregar_env(env_path: str = None):
    """Carrega variáveis do arquivo .env caso existam e não estejam no ambiente."""
    if env_path is None:
        env_path = os.path.join(PASTA_PROJETO, ".env")

    if not os.path.exists(env_path):
        return

    try:
        with open(env_path, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if not line or line.startswith("#") or "=" not in line:
                    continue
                chave, valor = line.split("=", 1)
                chave = chave.strip()
                valor = valor.strip().strip('"').strip("'")
                if chave and chave not in os.environ:
                    os.environ[chave] = valor
    except Exception as err:
        print(f"⚠️ Erro ao ler arquivo .env: {err}")


def vaga_para_descartar(vaga: dict, destino: str) -> str:
    """Devolve o motivo do descarte da vaga, ou "" se ela deve ficar.

    Os dois filtros se complementam e nenhum dos dois é opcional: o de cargo
    tira sênior/pleno/especialista, o de escopo tira o estágio de RH que entrou
    na busca por radical. Devolver o motivo (e não só um booleano) é o que
    permite ao terminal dizer o que aconteceu em vez de somar tudo num número só.

    O escopo só vale em "Vagas Tech": em "Vagas Gerais", estágio de RH ou de
    compras é justamente o que a aba procura. O destino vem explícito do
    orquestrador, e não é deduzido do caminho do arquivo — deduzir faria o
    filtro de escopo desligar sozinho em qualquer cópia do histórico, que é
    exatamente o que acontece nos testes.
    """
    nome = vaga.get("name", "")
    if cargo_para_descartar(nome):
        return "cargo avançado"
    if destino == "tech" and estagio_fora_do_escopo(nome):
        return "estágio fora da área de tech"
    return ""


def carregar_e_limpar_cache(cache_file: str = CACHE_FILE_DEFAULT, dias_retencao: int = DIAS_RETENCAO_CACHE_DEFAULT) -> dict:
    """Lê o arquivo de cache e remove registros com mais de 'dias_retencao' dias mantendo os IDs puros."""
    agora_br = datetime.now(FUSO_SP)

    if not os.path.exists(cache_file):
        return {}

    try:
        with open(cache_file, "r", encoding="utf-8") as f:
            conteudo = f.read().strip()
            if not conteudo:
                return {}
            dados = json.loads(conteudo)

        if isinstance(dados, list):
            data_hoje_iso = agora_br.isoformat()
            return {str(vaga_id): data_hoje_iso for vaga_id in dados}

        if not isinstance(dados, dict):
            return {}

        cache_limpo = {}
        data_limite = agora_br - timedelta(days=dias_retencao)

        for vaga_id, data_iso in dados.items():
            try:
                data_vista = datetime.fromisoformat(data_iso)
                if data_vista > data_limite:
                    id_str = str(vaga_id)
                    id_puro = id_str.rsplit("_", 1)[-1] if ("_" in id_str and id_str.rsplit("_", 1)[-1].isdigit()) else id_str
                    cache_limpo[id_puro] = data_iso
            except (ValueError, TypeError):
                continue

        return cache_limpo

    except Exception as err:
        print(f"⚠️ Erro ao ler/limpar o cache: {err}. Reiniciando cache.")
        return {}


def salvar_cache(cache_dados: dict, cache_file: str = CACHE_FILE_DEFAULT):
    """Salva os dados do cache formatados no arquivo JSON."""
    try:
        with open(cache_file, "w", encoding="utf-8") as f:
            json.dump(cache_dados, f, indent=2, ensure_ascii=False)
    except Exception as err:
        print(f"❌ Erro ao salvar o cache em {cache_file}: {err}")



def carregar_e_limpar_vagas_recentes(
    vagas_recentes_file: str = VAGAS_RECENTES_FILE_DEFAULT,
    dias_retencao: int = DIAS_RETENCAO_CACHE_DEFAULT,
    destino: str = "tech",
) -> list:
    """Carrega e limpa vagas do arquivo: antigas (> dias_retencao) e fora do escopo.

    O corte por cargo e o de escopo de área são repetidos aqui, e não só na
    captura, para que as vagas que entraram antes dos filtros saiam na próxima
    execução — é o que faz a limpeza surtir efeito no histórico já gravado.
    """
    agora_br = datetime.now(FUSO_SP)
    data_limite = agora_br - timedelta(days=dias_retencao)

    if not os.path.exists(vagas_recentes_file):
        return []

    try:
        with open(vagas_recentes_file, "r", encoding="utf-8") as f:
            conteudo = f.read().strip()
            if not conteudo:
                return []
            vagas = json.loads(conteudo)

        if not isinstance(vagas, list):
            return []

        vagas_validas = []
        for vaga in vagas:
            if vaga_para_descartar(vaga, destino):
                continue
            raw_date = vaga.get("publishedDate")
            if raw_date:
                try:
                    data_utc = datetime.fromisoformat(raw_date.replace("Z", "+00:00"))
                    data_br = data_utc.astimezone(FUSO_SP)
                    if data_br > data_limite:
                        vagas_validas.append(vaga)
                except (ValueError, TypeError):
                    continue
            else:
                continue

        return vagas_validas
    except Exception as err:
        print(f"⚠️ Erro ao ler/limpar vagas recentes: {err}. Reiniciando.")
        return []


def carregar_descartadas(descartadas_file: str = VAGAS_DESCARTADAS_FILE_DEFAULT) -> list:
    """Lê o arquivo de auditoria. Ausente/corrompido vira lista vazia.

    Não repete o corte por data como `carregar_e_limpar_vagas_recentes`: aqui a
    poda acontece na gravação, onde a data de publicação já está em mãos.
    """
    if not os.path.exists(descartadas_file):
        return []

    try:
        with open(descartadas_file, "r", encoding="utf-8") as f:
            conteudo = f.read().strip()
        dados = json.loads(conteudo) if conteudo else []
        return dados if isinstance(dados, list) else []
    except Exception as err:
        print(f"⚠️ Erro ao ler vagas descartadas: {err}. Recomeçando.")
        return []


def salvar_descartadas(
    novas: list,
    descartadas_file: str = VAGAS_DESCARTADAS_FILE_DEFAULT,
    dias_retencao: int = DIAS_RETENCAO_CACHE_DEFAULT,
):
    """Grava as vagas recém-descartadas e poda o que saiu da janela.

    O arquivo guarda só o que a pessoa precisa para auditar o corte: título,
    empresa, motivo, data e link. **A descrição não vem junto** — seriam centenas
    de requisições a mais por rodada para um texto que ninguém lê nessa aba, e
    é justamente a lista de vagas que o filtro mandou embora.

    A retenção é a mesma do histórico (7 dias): passados 7 dias a vaga já saiu
    do dashboard, então mantê-la aqui só guardaria lixo.
    """
    # A projeção é feita aqui, e não no chamador, para a garantia ser do
    # arquivo e não de quem chama: `description` é o campo grande da vaga (dezenas
    # de KB por vaga) e a lista de auditoria é a única que não precisa dele.
    # Passar a vaga inteira "por garantia" faria o arquivo crescer sem limite.
    campos = (
        "id", "name", "careerPageName", "topic", "motivo",
        "publishedDate", "data_formatada_br", "jobUrl", "workplaceType",
    )

    # Junta o que já estava com o que chegou e deduplica por ID. A mesma vaga
    # pode ser descartada por termos diferentes — o `jobName` é por radical e
    # "analista de suporte sênior" casa em mais de uma busca — e o arquivo é
    # reescrito a cada rodada, então sem isso ela apareceria repetida.
    # Um dict também resolve a ordem: a inserção preserva a primeira ocorrência.
    unicas = {}
    for vaga in carregar_descartadas(descartadas_file) + (novas or []):
        vaga_id = str(vaga.get("id", ""))
        if not vaga_id:
            continue
        entrada = {campo: vaga.get(campo, "") for campo in campos}
        if vaga_id not in unicas:
            unicas[vaga_id] = entrada

    agora_br = datetime.now(FUSO_SP)
    data_limite = agora_br - timedelta(days=dias_retencao)
    mantidas = []
    for vaga in unicas.values():
        raw_date = vaga.get("publishedDate")
        if not raw_date:
            continue
        try:
            data_br = datetime.fromisoformat(raw_date.replace("Z", "+00:00")).astimezone(FUSO_SP)
        except (ValueError, TypeError):
            continue
        if data_br > data_limite:
            mantidas.append(vaga)

    mantidas.sort(key=lambda v: v.get("publishedDate", ""), reverse=True)

    try:
        os.makedirs(os.path.dirname(descartadas_file), exist_ok=True)
        with open(descartadas_file, "w", encoding="utf-8") as f:
            json.dump(mantidas, f, indent=2, ensure_ascii=False)
    except Exception as err:
        print(f"❌ Erro ao salvar vagas descartadas: {err}")


def ids_no_historico(vagas_recentes_file: str) -> set:
    """IDs de vagas presentes nos DOIS históricos (tech + gerais).

    `descricoes.json` é um arquivo só, então a poda tem de considerar a união:
    considerar só o arquivo que está sendo escrito apagaria as descrições do
    outro destino a cada rodada.
    """
    ids = set()
    for arquivo in (VAGAS_RECENTES_FILE_DEFAULT, VAGAS_GERAIS_FILE_DEFAULT):
        try:
            with open(arquivo, "r", encoding="utf-8") as f:
                ids.update(str(vaga.get("id")) for vaga in json.load(f))
        except Exception:
            continue
    return ids


def salvar_vagas_recentes(
    novas_vagas: list,
    rotulo: str,
    vagas_recentes_file: str = VAGAS_RECENTES_FILE_DEFAULT,
    destino: str = "tech",
):
    """Adiciona novas vagas ao histórico e salva (mantém apenas últimas 7 dias).

    As seções de "Responsabilidades e Atribuições" em diante vão para
    `descricoes.json`, que é reescrito a partir dos IDs que continuam nos dois
    históricos — assim os arquivos envelhecem juntos.
    """
    vagas_existentes = carregar_e_limpar_vagas_recentes(vagas_recentes_file, destino=destino)

    ids_existentes = {v.get("id") for v in vagas_existentes}
    novas_para_descrever = []

    for vaga in novas_vagas:
        vaga_id = str(vaga.get("id"))
        if vaga_id not in ids_existentes:
            vaga_completa = {
                "id": vaga_id,
                "name": vaga.get("name", ""),
                "workplaceType": vaga.get("workplaceType", ""),
                "jobUrl": vaga.get("jobUrl", ""),
                "publishedDate": vaga.get("publishedDate", ""),
                "topic": rotulo,
                "data_formatada_br": vaga.get("data_formatada_br", ""),
                "careerPageName": vaga.get("careerPageName", ""),
                "careerPageUrl": vaga.get("careerPageUrl", ""),
                "careerPageLogo": vaga.get("careerPageLogo", ""),
                "isRemoteWork": vaga.get("isRemoteWork", False),
                "city": vaga.get("city", ""),
                "state": vaga.get("state", ""),
                "country": vaga.get("country", "")
            }
            vagas_existentes.append(vaga_completa)
            ids_existentes.add(vaga_id)
            # O `description` não vai para o histórico: fica só em
            # `descricoes.json`, já organizado em seções. A página da vaga é
            # preferida porque traz o HTML original (títulos, bullets e
            # subtítulos); o texto da API entra só de reserva.
            novas_para_descrever.append(vaga)

    vagas_existentes.sort(key=lambda v: v.get("publishedDate", ""), reverse=True)

    try:
        with open(vagas_recentes_file, "w", encoding="utf-8") as f:
            json.dump(vagas_existentes, f, indent=2, ensure_ascii=False)
    except Exception as err:
        print(f"❌ Erro ao salvar vagas_recentes.json: {err}")

    # Descrição em lote: as páginas são requisições independentes, então vão em
    # paralelo em vez de pagar a latência uma por vez (ver `descrever_vagas`).
    descricoes_novas = descrever_vagas(novas_para_descrever)
    # O arquivo de descrições é único, então a poda considera os dois históricos.
    ids_para_manter = ids_no_historico(vagas_recentes_file) | {str(v.get("id")) for v in vagas_existentes}
    sincronizar_descricoes(ids_para_manter, descricoes_novas)


def consultar_api_gupy(api_url: str, max_tentativas: int = 3) -> list:
    """Consulta a API da Gupy com retentativas automáticas."""
    req = urllib.request.Request(
        api_url,
        headers={"User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36"}
    )
    for tentativa in range(1, max_tentativas + 1):
        try:
            with urllib.request.urlopen(req, timeout=30) as response:
                data = json.loads(response.read().decode("utf-8"))
                return data.get("data", [])
        except Exception as err:
            print(f"⚠️ Tentativa {tentativa}/{max_tentativas} falhou na API da Gupy: {err}")
            if tentativa < max_tentativas:
                time.sleep(2)
    raise RuntimeError("Falha ao consultar a API da Gupy após múltiplas tentativas.")


def executar_monitoramento(
    rotulo: str,
    api_url: str,
    max_dias_pub: int = MAX_DIAS_PUBLICACAO_DEFAULT,
    dias_retencao_cache: int = DIAS_RETENCAO_CACHE_DEFAULT,
    cache_file: str = CACHE_FILE_DEFAULT,
    vagas_recentes_file: str = VAGAS_RECENTES_FILE_DEFAULT,
    rotulo_exibicao: str = "",
    destino: str = "tech",
    descartadas_file: str = VAGAS_DESCARTADAS_FILE_DEFAULT,
) -> int:
    """
    Executa o fluxo de busca na API da Gupy, filtragem por data e cache global com IDs puros,
    e atualização do cache e histórico em disco.

    `rotulo` é o campo `topic` que vai para o JSON; `rotulo_exibicao` é como a
    consulta aparece no terminal (termo buscado + rótulo). Vários termos
    compartilham o mesmo `rotulo`, então são eles que se repetem no log.

    `destino` ("tech" ou "geral") decide se o filtro de escopo de área roda: em
    "Vagas Tech" estágio de RH está fora, em "Vagas Gerais" é o que se procura.
    """
    exibicao = rotulo_exibicao or rotulo
    carregar_env()
    agora_br = datetime.now(FUSO_SP)

    # 1. Carrega e limpa o cache
    cache_vagas = carregar_e_limpar_cache(cache_file, dias_retencao_cache)

    try:
        # 2. Requisição para a API da Gupy
        vagas = consultar_api_gupy(api_url)

        novas_vagas = []
        # Um contador por motivo: o terminal precisa dizer o que saiu, senão
        # "51 descartadas" não deixa claro se o filtro de cargo ou o de área
        # é que está pegando.
        descartadas = {"cargo avançado": 0, "estágio fora da área de tech": 0}
        # As que vão para o arquivo de auditoria. `salvar_descartadas` escolhe
        # quais campos gravar, então aqui basta a vaga como veio da API.
        para_auditoria = []

        for vaga in vagas:
            vaga_id = str(vaga.get("id"))
            raw_date = vaga.get("publishedDate")

            if raw_date:
                data_utc = datetime.fromisoformat(raw_date.replace("Z", "+00:00"))
                data_br = data_utc.astimezone(FUSO_SP)

                # Filtro: descarta se a vaga tiver sido publicada há mais de max_dias_pub dias
                if (agora_br - data_br).days > max_dias_pub:
                    continue

                vaga["data_formatada_br"] = data_br.strftime("%d/%m/%Y às %H:%M")

            # Filtros: cargo avançado (sênior, pleno, especialista, gerente) e
            # estágio de área que não é de tecnologia. As descartadas entram no
            # cache para não ser re-avaliadas a cada rodada, mas não vão para o
            # histórico nem para o dashboard.
            motivo = vaga_para_descartar(vaga, destino)
            if motivo:
                if vaga_id not in cache_vagas:
                    cache_vagas[vaga_id] = agora_br.isoformat()
                    # O motivo é o que responde "por que essa vaga sumiu?".
                    para_auditoria.append({**vaga, "motivo": motivo, "topic": rotulo})
                descartadas[motivo] += 1
                continue

            # Checa se o ID original da vaga já foi notificado anteriormente
            if vaga_id not in cache_vagas:
                novas_vagas.append(vaga)
                cache_vagas[vaga_id] = agora_br.isoformat()

        # A poda do arquivo de auditoria roda sempre, mesmo sem vaga nova: é o
        # mesmo caminho de `salvar_vagas_recentes`, e sem ele o arquivo só
        # cresceria. A lista vazia faz a gravação reescrever com o que sobrou.
        salvar_descartadas(para_auditoria, descartadas_file)

        for motivo, total in descartadas.items():
            if total:
                print(f"Descartadas {total} vaga(s) por {motivo} para [{exibicao}].")

        # 3. Salva no histórico e no cache
        if novas_vagas:
            print(f"Encontradas {len(novas_vagas)} nova(s) vaga(s) para [{exibicao}]!")

            # Salva no histórico de vagas recentes (para dashboard)
            salvar_vagas_recentes(novas_vagas, rotulo, vagas_recentes_file, destino=destino)

            salvar_cache(cache_vagas, cache_file)
            return len(novas_vagas)
        else:
            salvar_cache(cache_vagas, cache_file)
            # Limpa o histórico mesmo sem vaga nova. Passar lista vazia reescreve
            # o arquivo com o que sobrou depois dos filtros; chamar a limpeza
            # só para ler devolveria a lista sem gravá-la, e as vagas fora do
            # escopo ficariam no histórico para sempre.
            salvar_vagas_recentes([], rotulo, vagas_recentes_file, destino=destino)
            print(f"Nenhuma vaga nova publicada nos últimos {max_dias_pub} dias para [{exibicao}].")
            return 0

    except Exception as e:
        print(f"❌ Erro ao consultar/processar vagas para [{exibicao}]: {e}")
        return 0
