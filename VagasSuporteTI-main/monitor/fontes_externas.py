"""Vagas de suporte de T.I. fora da Gupy: LinkedIn, InfoJobs e Catho.

Nenhum dos três tem API pública de busca de vagas, então a leitura é feita nas
páginas públicas de resultado — as mesmas que qualquer pessoa vê sem login.
Não há login, não há truque para driblar bloqueio: se um site recusar
(HTTP 429/403, captcha), a fonte é pulada nesta rodada e o resto segue.

Cada leitor devolve vagas no mesmo formato que a API da Gupy, para que
`common.executar_monitoramento` trate tudo do mesmo jeito:

    {"id": "ij-12132713", "name": ..., "careerPageName": ..., "city": ...,
     "workplaceType": "on-site"|"remote", "publishedDate": ISO-8601,
     "jobUrl": ..., "fonte": "InfoJobs"}

O prefixo no `id` ("li-", "ij-", "ca-") evita colisão com os IDs da Gupy no
cache de deduplicação.

Os leitores dependem do HTML de cada site. Quando um site muda o layout, o
leitor passa a devolver lista vazia (e o terminal avisa), sem derrubar o
monitoramento da Gupy.
"""

import html as htmllib
import re
import time
import unicodedata
import urllib.request
from datetime import datetime, timedelta, timezone
from urllib.parse import quote, urlencode

FUSO_BR = timezone(timedelta(hours=-3))
TIMEOUT = 25
# Intervalo entre requisições ao MESMO site. O LinkedIn devolve 429 já na
# segunda busca seguida se ela vier rápido demais.
INTERVALO_MESMO_SITE = 6

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
                  "(KHTML, like Gecko) Chrome/124.0 Safari/537.36",
    "Accept-Language": "pt-BR,pt;q=0.9",
}

# Mesmas cidades da busca presencial da Gupy (consultas.CIDADES). Vaga de
# outra cidade só entra se for remota.
CIDADES_ACEITAS = {
    "sao paulo", "sao bernardo do campo", "santo andre", "sao caetano do sul",
    "diadema", "maua", "ribeirao pires", "rio grande da serra",
}

# (termo, rótulo) — o rótulo é só reserva: o nível (N1, N2, Jr, Help Desk) é
# decidido pelo título, como na Gupy (`common.rotulo_da_vaga`).
TERMOS = [
    ("suporte técnico", "Suporte"),
    ("help desk", "Suporte"),
    ("suporte n1", "Suporte"),
]


# LinkedIn e Catho buscam o termo também na DESCRIÇÃO da vaga: "help desk"
# traz "Analista Financeiro" só porque o texto cita o chamado no help desk.
# A Gupy busca só no título, então aqui o título precisa citar suporte para a
# vaga entrar — é o mesmo critério nas quatro fontes.
RE_TITULO_RELEVANTE = re.compile(r"suporte|help\s*-?\s*desk|service\s*-?\s*desk|\bn[12]\b")


def _titulo_relevante(titulo: str) -> bool:
    return bool(RE_TITULO_RELEVANTE.search(_sem_acento(titulo)))


def _sem_acento(texto: str) -> str:
    return "".join(c for c in unicodedata.normalize("NFD", (texto or "").lower())
                   if not unicodedata.combining(c))


def _slug(texto: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", _sem_acento(texto)).strip("-")


def _limpar(texto: str) -> str:
    return re.sub(r"\s+", " ", htmllib.unescape(re.sub(r"<[^>]+>", " ", texto or ""))).strip()


def _baixar(url: str) -> str:
    req = urllib.request.Request(url, headers=HEADERS)
    with urllib.request.urlopen(req, timeout=TIMEOUT) as resposta:
        return resposta.read().decode("utf-8", "replace")


def _cidade_aceita(cidade: str, remota: bool) -> bool:
    if remota:
        return True
    base = _sem_acento(cidade).split(",")[0].split(" - ")[0].strip()
    return base in CIDADES_ACEITAS


def _iso(data: datetime) -> str:
    return data.astimezone(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.000Z")


def _data_dia_mes(dia_mes: str, agora: datetime) -> datetime:
    """'15/10' -> datetime no ano certo (dezembro lido em janeiro é do ano anterior)."""
    dia, mes = (int(x) for x in dia_mes.split("/")[:2])
    data = datetime(agora.year, mes, dia, 12, 0, tzinfo=FUSO_BR)
    if data > agora + timedelta(days=1):
        data = data.replace(year=agora.year - 1)
    return data


# --------------------------------------------------------------------------
# InfoJobs
# --------------------------------------------------------------------------

def ler_infojobs(pagina: str, rotulo: str) -> list:
    """Cartões da busca do InfoJobs: id, data exata, título, empresa e cidade."""
    vagas = []
    for bloco in re.split(r'(?=<div id="vacancy\d+")', pagina)[1:]:
        m_id = re.search(r'data-id="(\d+)"', bloco)
        m_titulo = re.search(r'js_vacancyTitle">(.*?)</h2>', bloco, re.S)
        if not (m_id and m_titulo):
            continue
        m_href = re.search(r'data-href="([^"]+)"', bloco)
        m_data = re.search(r'js_date" data-value="([\d/ :]+)"', bloco)
        m_empresa = re.search(r'href="[^"]*/empresa-[^"]*"[^>]*>(.*?)</a>', bloco, re.S)
        m_cidade = re.search(r'<div class="mb-8">\s*([^<]+?)<', bloco)

        if not _titulo_relevante(_limpar(m_titulo.group(1))):
            continue
        cidade = _limpar(m_cidade.group(1)) if m_cidade else ""
        remota = "remot" in _sem_acento(bloco[:4000]) or "home office" in _sem_acento(bloco[:4000])
        if not _cidade_aceita(cidade, remota):
            continue
        publicada = (
            datetime.strptime(m_data.group(1), "%Y/%m/%d %H:%M:%S").replace(tzinfo=FUSO_BR)
            if m_data else datetime.now(FUSO_BR)
        )
        empresa = _limpar(re.sub(r"<span[^>]*data-bs-title=.*", "", m_empresa.group(1), flags=re.S)) if m_empresa else ""
        vagas.append({
            "id": f"ij-{m_id.group(1)}",
            "name": _limpar(m_titulo.group(1)),
            "careerPageName": empresa or "Empresa confidencial",
            "city": cidade.split(" - ")[0],
            "state": "São Paulo",
            "workplaceType": "remote" if remota else "on-site",
            "isRemoteWork": remota,
            "publishedDate": _iso(publicada),
            "jobUrl": "https://www.infojobs.com.br" + m_href.group(1) if m_href else "",
            "fonte": "InfoJobs",
        })
    return vagas


def buscar_infojobs(termo: str, rotulo: str) -> list:
    # provincia=64 é o estado de SP; a cidade é filtrada depois, no cartão.
    url = "https://www.infojobs.com.br/empregos.aspx?" + urlencode({"palabra": termo, "provincia": 64})
    return ler_infojobs(_baixar(url), rotulo)


# --------------------------------------------------------------------------
# Catho
# --------------------------------------------------------------------------

def ler_catho(pagina: str, rotulo: str, cidade_busca: str) -> list:
    """Cartões da busca do Catho. A data é só dia/mês ("Publicada em 15/10")."""
    agora = datetime.now(FUSO_BR)
    vagas = []
    for bloco in re.split(r"(?=<li data-offer-item=)", pagina)[1:]:
        m_id = re.search(r'data-offer-item="(\d+)"', bloco)
        m_link = re.search(r'class="title_offer">\s*<a href="([^"]+)"[^>]*>(.*?)</a>', bloco, re.S)
        if not (m_id and m_link):
            continue
        m_empresa = re.search(r'<span class="text-12">(.*?)</span>', bloco, re.S)
        m_cidade = re.search(r"i_job_location.*?</strong>\s*-\s*([^<]+)<", bloco, re.S)
        m_data = re.search(r"(?:Publicada|Atualizada) em (\d{2}/\d{2})", bloco)
        if not _titulo_relevante(_limpar(m_link.group(2))):
            continue
        remota = "home office" in _sem_acento(bloco) or "remot" in _sem_acento(_limpar(m_link.group(2)))

        cidade = _limpar(m_cidade.group(1)) if m_cidade else cidade_busca
        if not _cidade_aceita(cidade, remota):
            continue
        publicada = _data_dia_mes(m_data.group(1), agora) if m_data else agora
        vagas.append({
            "id": f"ca-{m_id.group(1)}",
            "name": _limpar(m_link.group(2)),
            "careerPageName": _limpar(m_empresa.group(1)) if m_empresa else "Empresa confidencial",
            "city": cidade,
            "state": "São Paulo",
            "workplaceType": "remote" if remota else "on-site",
            "isRemoteWork": remota,
            "publishedDate": _iso(publicada),
            "jobUrl": "https://www.catho.com.br" + m_link.group(1),
            "fonte": "Catho",
        })
    return vagas


CIDADES_CATHO = ["sao-paulo-sp", "santo-andre-sp", "sao-bernardo-do-campo-sp", "sao-caetano-do-sul-sp"]


def buscar_catho(termo: str, rotulo: str) -> list:
    vagas = []
    for cidade in CIDADES_CATHO:
        url = f"https://www.catho.com.br/vagas/{_slug(termo)}/{cidade}/?order=dataAtualizacao"
        nome_cidade = cidade.removesuffix("-sp").replace("-", " ").title()
        try:
            vagas += ler_catho(_baixar(url), rotulo, nome_cidade)
        except Exception as err:
            print(f"⚠️ Catho [{termo} / {cidade}]: {err}")
        time.sleep(INTERVALO_MESMO_SITE)
    return vagas


# --------------------------------------------------------------------------
# LinkedIn (página pública de vagas, a mesma que abre sem login)
# --------------------------------------------------------------------------

def ler_linkedin(pagina: str, rotulo: str) -> list:
    vagas = []
    for bloco in re.split(r"(?=<li)", pagina)[1:]:
        m_id = re.search(r"urn:li:jobPosting:(\d+)", bloco)
        m_titulo = re.search(r'base-search-card__title">(.*?)</h3>', bloco, re.S)
        if not (m_id and m_titulo):
            continue
        m_empresa = re.search(r'base-search-card__subtitle">(.*?)</h4>', bloco, re.S)
        m_cidade = re.search(r'job-search-card__location">(.*?)</span>', bloco, re.S)
        m_data = re.search(r'<time[^>]*datetime="(\d{4}-\d{2}-\d{2})"', bloco)
        m_link = re.search(r'base-card__full-link[^>]*href="([^"?]+)', bloco)

        if not _titulo_relevante(_limpar(m_titulo.group(1))):
            continue
        cidade = _limpar(m_cidade.group(1)) if m_cidade else ""
        remota = "remot" in _sem_acento(cidade)
        if not _cidade_aceita(cidade, remota):
            continue
        publicada = (
            datetime.strptime(m_data.group(1), "%Y-%m-%d").replace(hour=12, tzinfo=FUSO_BR)
            if m_data else datetime.now(FUSO_BR)
        )
        vagas.append({
            "id": f"li-{m_id.group(1)}",
            "name": _limpar(m_titulo.group(1)),
            "careerPageName": _limpar(m_empresa.group(1)) if m_empresa else "",
            "city": cidade.split(",")[0],
            "state": "São Paulo",
            "workplaceType": "remote" if remota else "on-site",
            "isRemoteWork": remota,
            "publishedDate": _iso(publicada),
            "jobUrl": htmllib.unescape(m_link.group(1)) if m_link else
                      f"https://www.linkedin.com/jobs/view/{m_id.group(1)}",
            "fonte": "LinkedIn",
        })
    return vagas


def buscar_linkedin(termo: str, rotulo: str) -> list:
    # f_TPR=r1209600: publicadas nos últimos 14 dias, a mesma janela da aba.
    url = ("https://www.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search?"
           + urlencode({"keywords": termo, "location": "São Paulo, Brasil",
                        "f_TPR": "r1209600", "start": 0}, quote_via=quote))
    return ler_linkedin(_baixar(url), rotulo)


# --------------------------------------------------------------------------

FONTES = [
    ("LinkedIn", buscar_linkedin),
    ("InfoJobs", buscar_infojobs),
    ("Catho", buscar_catho),
]


def gerar_buscas_externas():
    """(fonte, termo, rótulo, função) — uma por fonte x termo."""
    for nome, funcao in FONTES:
        for termo, rotulo in TERMOS:
            yield nome, termo, rotulo, funcao
