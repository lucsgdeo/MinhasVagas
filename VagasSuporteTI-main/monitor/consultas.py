"""Consultas à API da Gupy.

Único arquivo a editar para incluir, remover ou ajustar uma busca.
URL, pasta de destino e rótulo do card saem daqui.
"""

from dataclasses import dataclass
from urllib.parse import urlencode

BASE_URL = "https://portal.gupy.io/api/job-search/jobs"

CIDADES = "São Bernardo do Campo,Diadema,Santo André,São Caetano do Sul,São Paulo"
ESTADO = "São Paulo"
LIMIT = 100  # teto da API; acima disso retorna HTTP 400

# As duas URLs padrão. Presencial e remoto só diferem neste filtro.
MODALIDADES = {
    "Presencial": {"city": CIDADES, "state": ESTADO},
    "Remoto": {"workplaceType": "remote"},
}

# ---------------------------------------------------------------------------
# A LISTA DE BUSCAS — adicione ou remova uma linha e pronto.
#
#   (jobName, destino, rótulo presencial)
#
#     jobName : termo buscado. None = todas as vagas, sem filtro de nome.
#     destino : "suporte" -> vagas_suporte.json (aba "Suporte T.I.")
#               "geral"   -> vagas_ti_geral.json (aba "T.I. em Geral")
#     rótulo  : texto exibido no card e usado pelos filtros do dashboard.
#               A variante remota deriva dele trocando o sufixo:
#               "Redes" -> "Redes Remoto".
#
# Na aba "Suporte T.I." o rótulo daqui é só reserva: o nível (N1, N2, Jr,
# Help Desk) sai do TÍTULO da vaga, em `descricoes.rotulo_suporte`, porque
# "suporte técnico" e "analista de suporte" trazem N1, N2 e Jr misturados.
#
# A ORDEM É IMPORTANTE. A primeira busca que encontra uma vaga fica com ela
# (as demais são ignoradas por deduplicação de ID): suporte primeiro, T.I. em
# geral depois. As buscas amplas ("suporte", "ti") vêm por último em cada
# grupo — são a rede de segurança para o que nenhum termo específico pegou.
#
# A API busca no título e ignora acento, e devolve no máximo 100 vagas por
# consulta: por isso os termos específicos vêm antes do amplo "suporte", que
# sozinho já passa de 100 em São Paulo (medido em 22/10/2026).
# ---------------------------------------------------------------------------
BUSCAS = [
    # ---- Suporte T.I.: o nível é decidido pelo título ----
    ("suporte n1", "suporte", "Suporte"),
    ("suporte n2", "suporte", "Suporte"),
    ("help desk", "suporte", "Suporte"),
    ("service desk", "suporte", "Suporte"),
    ("suporte técnico", "suporte", "Suporte"),
    ("técnico de suporte", "suporte", "Suporte"),
    ("analista de suporte", "suporte", "Suporte"),
    ("suporte jr", "suporte", "Suporte"),
    ("suporte ti", "suporte", "Suporte"),
    ("suporte", "suporte", "Suporte"),
    # ---- T.I. em Geral: Infraestrutura > Redes > Técnico > Analista > Assistente ----
    ("infraestrutura", "geral", "Infraestrutura"),
    ("redes", "geral", "Redes"),
    ("noc", "geral", "Redes"),
    ("técnico de informática", "geral", "Técnico de Informática"),
    ("técnico de ti", "geral", "Técnico de Informática"),
    ("analista de ti", "geral", "Analista de TI"),
    ("assistente de ti", "geral", "Assistente de TI"),
    ("auxiliar de ti", "geral", "Assistente de TI"),
    ("ti", "geral", "TI Geral"),
]

# Onde cada busca grava o resultado.
DESTINOS = {
    "suporte": "vagas_suporte.json",
    "geral": "vagas_ti_geral.json",
}


@dataclass(frozen=True)
class Consulta:
    job_name: str | None
    modalidade: str
    destino: str
    rotulo_base: str

    @property
    def rotulo(self) -> str:
        """Campo `topic` do JSON — é por ele que o card e os filtros funcionam."""
        if self.modalidade == "Presencial":
            return self.rotulo_base
        return f"{self.rotulo_base.removesuffix(' Presencial')} Remoto"

    @property
    def rotulo_exibicao(self) -> str:
        """Como a consulta aparece no terminal: o termo buscado e o rótulo gravado.

        Sem isso o log repete "Desenvolvimento" cinco vezes — uma por busca
        (desenvolvedor, desenvolvimento, dev, software, devops) — e não dá para
        saber qual delas trouxe a vaga. Só afeta a exibição: o `topic` do JSON
        continua sendo `rotulo`.
        """
        busca = f'"{self.job_name}"' if self.job_name else "(busca ampla)"
        return f"{busca} → {self.rotulo}"

    @property
    def url(self) -> str:
        params = {"limit": LIMIT, "offset": 0, **MODALIDADES[self.modalidade]}
        if self.job_name:
            params["jobName"] = self.job_name
        return f"{BASE_URL}?{urlencode(params)}"


def gerar_consultas():
    """Gera uma consulta por (busca x modalidade)."""
    for job_name, destino, rotulo_base in BUSCAS:
        for modalidade in MODALIDADES:
            yield Consulta(job_name, modalidade, destino, rotulo_base)
