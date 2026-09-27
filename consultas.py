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
#     destino : "tech"  -> vagas_recentes.json (aba "Vagas Tech")
#               "geral" -> vagas_gerais.json  (aba "Vagas Gerais")
#     rótulo  : texto exibido no card. A variante remota deriva dele
#               trocando o sufixo: "Suporte" -> "Suporte Remoto".
# ---------------------------------------------------------------------------
BUSCAS = [
    ("Suporte", "tech", "Suporte"),
    ("TI", "tech", "TI"),
    ("infra", "tech", "Infraestrutura"),
    ("Service Desk", "tech", "Service Desk"),
    ("Júnior", "tech", "Júnior"),
    ("Help Desk", "tech", "Help Desk"),
    ("jr", "tech", "JR"),
    ("assistente", "geral", "Assistente Presencial"),
    ("auxiliar", "geral", "Auxiliar Presencial"),
    (None, "geral", "Geral Presencial"),
]

# Onde cada busca grava o resultado.
DESTINOS = {
    "tech": "vagas_recentes.json",
    "geral": "vagas_gerais.json",
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
