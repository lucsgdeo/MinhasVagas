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

# O botão "abc" é geográfico, não um cargo: é a busca ampla (sem `jobName`)
# restrita ao ABC Paulista — Santo André, São Bernardo, Diadema e São Caetano do
# Sul, sem São Paulo capital. Por isso ele usa um terceiro grupo de cidades, e
# não um termo. Sem o `city`, a consulta traria o estado inteiro.
CIDADES_ABC = "São Bernardo do Campo,Diadema,Santo André,São Caetano do Sul"

# As duas URLs padrão. Presencial e remoto só diferem neste filtro.
MODALIDADES = {
    "Presencial": {"city": CIDADES, "state": ESTADO},
    "Remoto": {"workplaceType": "remote"},
}

# consultedor = False gera uma consulta só, em vez de uma por modalidade. É o
# caso do ABC: "remoto" e "presencial" não são categorias lá, é o mesmo lugar.
# Sem isso, o botão "abc" apareceria também em "Remoto" e contaria as vagas
# remotas de qualquer empresa — que não são vagas do ABC.
APENAS_PRESENCIAL = {"apenas_presencial": True}

# ---------------------------------------------------------------------------
# A LISTA DE BUSCAS — adicione ou remova uma linha e pronto.
#
#   (jobName, destino, rótulo presencial, ajustes)
#
#     jobName   : termo buscado. None = todas as vagas, sem filtro de nome.
#     destino   : "tech"  -> vagas_recentes.json (aba "Vagas Tech")
#                 "geral" -> vagas_gerais.json (aba "Vagas Gerais")
#     rótulo    : texto exibido no card e usado pelos filtros do dashboard.
#                 A variante remota deriva dele trocando o sufixo:
#                 "Suporte" -> "Suporte Remoto".
#     ajustes   : opcional. Ver OPCOES_DE_BUSCA.
#
# A ORDEM É IMPORTANTE. A primeira busca que encontra uma vaga define o rótulo
# dela (as demais são ignoradas por deduplicação de ID), então a lista segue a
# ordem dos botões do dashboard: tech primeiro, gerais depois. A busca ampla
# (jobName None) vem por último de propósito — ela é a rede de segurança que
# rotula as vagas que nenhum termo específico capturou.
#
# Termos que a API já resolve sozinha, por equivalência sem acento ou por
# radical: "estagio" cobre estagiario/estágio/estagiária; "desenvolvedor"
# cobre desenvolvedora; "sistemas" cobre sistema; "técnico" cobre técnica. Os
# demais são buscas à parte porque a API não os cobre: "trainee" e "developer",
# por exemplo, devolvem conjuntos totalmente disjuntos dos vizinhos.
# ---------------------------------------------------------------------------

# Ajustes aceitos no quarto campo da linha:
#   apenas_presencial : gera uma consulta só, na modalidade presencial.
#   cidades           : substitui a lista de cidades da modalidade presencial.
OPCOES_DE_BUSCA = ("apenas_presencial", "cidades")

BUSCAS = [
    # ---- Vagas Tech: ordem dos botões Todas > Estágio > Suporte > Dev > TI > Outras ----
    # O botão "Todas" não tem busca: ele mostra tudo menos estágio. Por isso o
    # "Estágio" é o primeiro da lista — ele é o conjunto que o "Todas" exclui.
    # Estágio
    ("estagio", "tech", "Estágio"),
    ("estagiario", "tech", "Estágio"),
    # "trainee" é entrada como estágio e chega por busca própria: os IDs são
    # disjuntos de "estagio"/"estagiario".
    ("trainee", "tech", "Estágio"),
    # Suporte
    ("Suporte", "tech", "Suporte"),
    # Suporte também chega pelo termo "técnico", que a API resolve com acento:
    # "técnico" e "técnica" caem na mesma busca, então uma linha só basta.
    ("técnico", "tech", "Suporte"),
    # Dev
    ("desenvolvedor", "tech", "Desenvolvimento"),
    ("desenvolvimento", "tech", "Desenvolvimento"),
    ("dev", "tech", "Desenvolvimento"),
    ("developer", "tech", "Desenvolvimento"),
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
    ("e-commerce", "tech", "Outras"),
    # A API trata "e-commerce" e "ecommerce" como buscas distintas: a variante
    # sem hífen traz vagas cujo nome usa só "ECOMMERCE". As duas linhas
    # compartilham o rótulo, então o botão "Outras" mostra o conjunto inteiro.
    ("ecommerce", "tech", "Outras"),
    # ---- Vagas Gerais: ABC > Banco de Talentos > Administrativo > Almoxarifado > Junior > Auxiliar > Remoto ----
    # O ABC vem primeiro porque é o botão padrão da aba e o lugar onde a pessoa
    # realmente quer trabalhar; os termos de cargo depois, para quem procura
    # outro recorte.
    (None, "geral", "ABC", {"apenas_presencial": True, "cidades": CIDADES_ABC}),
    ("banco de talentos", "geral", "Banco de Talentos"),
    ("administrativo", "geral", "Administrativo"),
    ("almoxarifado", "geral", "Almoxarifado"),
    ("jr", "geral", "Júnior"),
    ("Júnior", "geral", "Júnior"),
    ("auxiliar", "geral", "Auxiliar Presencial"),
    # A busca ampla vem por último e rotula as sobras: as vagas de cargo que
    # nenhum termo de cima pegou. O botão "Remoto" é o último da aba e não é
    # uma busca — ele filtra por modalidade, então alcança também as remotas
    # que os termos acima rotularam.
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
    cidades: str = CIDADES

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
        params = {"limit": LIMIT, "offset": 0}
        if self.modalidade == "Remoto":
            params.update(MODALIDADES[self.modalidade])
        else:
            # A lista de cidades vem da própria consulta, e não do dicionário
            # fixo: é o que permite ao botão "abc" consultar só o ABC Paulista.
            params["city"] = self.cidades
            params["state"] = ESTADO
        if self.job_name:
            params["jobName"] = self.job_name
        return f"{BASE_URL}?{urlencode(params)}"


def gerar_consultas():
    """Gera uma consulta por (busca x modalidade).

    A linha pode ter ajustes: `apenas_presencial` corta a variante remota, e
    `cidades` troca a lista de cidades da consulta presencial.
    """
    for linha in BUSCAS:
        job_name, destino, rotulo_base, *ajustes = linha
        opcoes = ajustes[0] if ajustes else {}

        if opcoes.get("apenas_presencial"):
            modalidades = ("Presencial",)
        else:
            modalidades = tuple(MODALIDADES)

        cidades = opcoes.get("cidades", CIDADES)
        for modalidade in modalidades:
            yield Consulta(job_name, modalidade, destino, rotulo_base, cidades)
