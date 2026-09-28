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
#     rótulo  : texto exibido no card e usado pelos filtros do dashboard.
#               A variante remota deriva dele trocando o sufixo:
#               "Suporte" -> "Suporte Remoto".
#
# A ORDEM É IMPORTANTE. A primeira busca que encontra uma vaga define o rótulo
# dela (as demais são ignoradas por deduplicação de ID), então a lista segue a
# ordem dos botões do dashboard: tech primeiro, gerais depois. A busca ampla
# (jobName None) vem por último de propósito — ela é a rede de segurança que
# rotula as vagas que nenhum termo específico capturou.
#
# Termos que a API já resolve sozinha, por equivalência sem acento ou por
# radical: "estagio" cobre estagiario/estágio/estagiária; "desenvolvedor"
# cobre desenvolvedora; "sistemas" cobre sistema. Os demais são buscas à parte
# porque a API não os cobre: "estagiario" e "estagio", por exemplo, devolvem
# conjuntos de IDs totalmente disjuntos.
# ---------------------------------------------------------------------------
BUSCAS = [
    # ---- Vagas Tech: ordem dos botões Suporte > Estágio > Dev > TI > Outras ----
    ("Suporte", "tech", "Suporte"),
    # Estágio
    ("estagio", "tech", "Estágio"),
    ("estagiario", "tech", "Estágio"),
    # Dev
    ("desenvolvedor", "tech", "Desenvolvimento"),
    ("desenvolvimento", "tech", "Desenvolvimento"),
    ("dev", "tech", "Desenvolvimento"),
    ("software", "tech", "Desenvolvimento"),
    ("devops", "tech", "Desenvolvimento"),
    ("sistemas", "tech", "Sistemas"),
    # TI
    ("TI", "tech", "TI"),
    ("tecnologia", "tech", "TI"),
    # Outras
    ("infra", "tech", "Outras"),
    ("help desk", "tech", "Outras"),
    ("service desk", "tech", "Outras"),
    # ---- Vagas Gerais: Assistente > Júnior > Auxiliar > Remoto > Presencial ----
    ("assistente", "geral", "Assistente Presencial"),
    ("jr", "geral", "Júnior"),
    ("Júnior", "geral", "Júnior"),
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
