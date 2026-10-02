# ðŸ¤– MinhasVagas - Dashboard e Monitoramento de Vagas Gupy

Sistema automatizado em Python para monitoramento periÃ³dico de vagas na plataforma **Gupy**, com deduplicaÃ§Ã£o global e **Dashboard Web interativo** hospedado no GitHub Pages.

> **Primeira vez aqui?** Comece por **[docs/instalacao.md](docs/instalacao.md)** â€” passo a passo para Linux, Windows e macOS, da instalaÃ§Ã£o do Python atÃ© a rodagem do dashboard.

---

## ðŸ“Œ Funcionalidades

- **Dashboard Web Moderno**:
  - **Aba "Vagas Tech"**: Exibe exclusivamente as vagas de tecnologia com filtros rÃ¡pidos por Ã¡rea (**Todas**, **EstÃ¡gio**, **Suporte**, **Dev**, **TI**, **Outras**) e busca textual em tempo real. O botÃ£o **Todas** mostra todas as vagas de tecnologia **menos estÃ¡gio**, e Ã© o filtro padrÃ£o. O botÃ£o **Dev** engloba tambÃ©m as vagas de sistemas; o botÃ£o **Outras** agrupa Infraestrutura, Help Desk, Service Desk e e-commerce.
  - **Aba "Vagas Gerais"**: Exibe vagas gerais da Grande SP e Remotas em arquivo dedicado (`vagas_gerais.json`), com separaÃ§Ã£o clara entre vagas **Presenciais** e **Remotas** e visualizaÃ§Ã£o agrupada em seÃ§Ãµes. O filtro padrÃ£o Ã© **ABC** â€” todas as vagas publicadas no ABC Paulista (Santo AndrÃ©, SÃ£o Bernardo do Campo, Diadema e SÃ£o Caetano do Sul), sem SÃ£o Paulo capital.
  - **Sub-abas "Ãšltimos 2 dias" / "NÃ£o Vistas" / "Todas"**: DisponÃ­veis dentro de "Vagas Tech" e "Vagas Gerais", nessa ordem, com **"Ãšltimos 2 dias"** como padrÃ£o ao abrir a pÃ¡gina.
    - **Ãšltimos 2 dias**: combina os filtros de cargo com a janela de **hoje + ontem** (dias do calendÃ¡rio, calculada em `calcularJanelaRecente()` em `assets/app.js` com o fuso horÃ¡rio local do navegador â€” do inÃ­cio de ontem atÃ© o inÃ­cio de amanhÃ£), mostrando apenas vagas publicadas nesse perÃ­odo e para as quais vocÃª ainda **nÃ£o** se candidatou, ordenadas da mais recente para a mais antiga.
    - **NÃ£o Vistas**: o mesmo conjunto da aba **Todas** (sem corte de data e sem reordenar), removendo apenas as vagas que vocÃª jÃ¡ marcou.
    - **Todas**: histÃ³rico completo, sem nenhum filtro de data ou marcaÃ§Ã£o.
  - **Aba "HorÃ¡rios de Postagem"**: GrÃ¡fico analÃ­tico de distribuiÃ§Ã£o de publicaÃ§Ãµes por hora, pico e perÃ­odos do dia, calculado estritamente com base nas **vagas de tecnologia**.
  - **Aba "Descartadas"** (Ã­cone de lixeira no fim da linha de abas): auditoria dos dois filtros â€” as vagas que saÃ­ram do histÃ³rico, com o **motivo** do corte em cada card. LÃª `vagas_descartadas.json`, que tem a mesma retenÃ§Ã£o de 7 dias do histÃ³rico e nÃ£o guarda a descriÃ§Ã£o da vaga. Ver [docs/buscas-e-filtros.md](docs/buscas-e-filtros.md).
  - **PersonalizaÃ§Ã£o de Temas**: dropdown Ãºnico com **22 cores** de destaque e **modo claro/escuro** (22 Ã— 2 combinaÃ§Ãµes), as duas escolhas persistidas no navegador. Sem preferÃªncia salva, o modo segue o sistema.
  - **MarcaÃ§Ã£o de Vistas**: Controle local com toggle "Vista" salvo no `localStorage`.
    - As listas de "Ãšltimos 2 dias" e "NÃ£o Vistas" sÃ£o **instantÃ¢neos do carregamento da pÃ¡gina**: marcar/desmarcar "Vista" (ou clicar em "Candidatar-se") mantÃ©m o card visÃ­vel na tela e apenas o destaca, sem removÃª-lo da lista. A vaga sÃ³ desaparece dessas abas no **prÃ³ximo carregamento da pÃ¡gina** (F5), momento em que o snapshot `state.appliedAtLoad` Ã© refeito a partir do `localStorage`. Na aba **Todas** a vaga permanece visÃ­vel sempre.
  - **Painel de DescriÃ§Ã£o da Vaga**: O botÃ£o **"Ver descriÃ§Ã£o"** no rodapÃ© de cada card abre uma sobreposiÃ§Ã£o pela direita com a vaga organizada em seÃ§Ãµes â€” **Responsabilidades**, **Requisitos**, **InformaÃ§Ãµes adicionais**, **BenefÃ­cios**, **SalÃ¡rio**, **Jornada de trabalho** e **Local de trabalho** â€” em lista formatada.
    - O arquivo `data/descricoes.json` Ã© baixado **sob demanda**, sÃ³ no primeiro clique: ele pesa ~380 KB (gzip) e nÃ£o Ã© necessÃ¡rio para listar as vagas, entÃ£o o carregamento da pÃ¡gina continua igual.
    - Fecha pelo botÃ£o **âœ•**, pelo clique fora do painel ou pela tecla **Esc**.
    - ~8% das vagas nÃ£o trazem a seÃ§Ã£o "Responsabilidades" em texto (usam "Sobre a oportunidade", "O que buscamos?"â€¦): nesses casos o painel avisa e mantÃ©m o botÃ£o **Candidatar-se â†’** para a vaga original.
- **Buscas ConfigurÃ¡veis**: Todos os termos monitorados ficam centralizados em uma Ãºnica lista (`BUSCAS` em `monitor/consultas.py`). Cada termo gera uma consulta presencial e uma remota a partir de duas URLs padrÃ£o.
- **Isolamento de Dados**: SeparaÃ§Ã£o fÃ­sica entre o histÃ³rico de tech (`vagas_recentes.json`) e vagas gerais (`vagas_gerais.json`).
- **Ordem de ExecuÃ§Ã£o**: Os termos de tech rodam primeiro, garantindo prioridade no registro do cache (`vagas_vistas.json`) e evitando que vagas tÃ©cnicas sejam duplicadas na listagem geral.
- **DeduplicaÃ§Ã£o Global**: Armazena o ID original de cada vaga no arquivo de histÃ³rico (`vagas_vistas.json`). Se a mesma vaga for encontrada por termos diferentes, ela sÃ³ Ã© registrada na primeira consulta que a encontrar.
- **Filtro de Cargo**: Vagas de nÃ­vel avanÃ§ado sÃ£o descartadas antes de entrar no histÃ³rico (sÃªnior/pleno/especialista/gerente/diretor/coordenador/supervisor/lÃ­der). O corte Ã© pelo **tÃ­tulo** da vaga, em `cargo_para_descartar()` (`monitor/descricoes.py`) â€” a API da Gupy nÃ£o aceita exclusÃ£o (`excludeTerms` Ã© ignorado, e `jobName=dev -senior` devolve outro conjunto). Detalhes em [docs/buscas-e-filtros.md](docs/buscas-e-filtros.md).
- **Filtro de Escopo de Ãrea**: as buscas `estagio` e `estagiario` sÃ£o por radical e nÃ£o aceitam filtro de Ã¡rea, entÃ£o o corte Ã© em `estagio_fora_do_escopo()` (`monitor/descricoes.py`). Ele vale **sÃ³ na aba Vagas Tech** â€” em **Vagas Gerais**, estÃ¡gio de RH Ã© justamente o que a aba procura. Detalhes em [docs/buscas-e-filtros.md](docs/buscas-e-filtros.md).
- **Filtro de RecorrÃªncia**: Considera apenas vagas publicadas nos Ãºltimos 4 dias e limpa automaticamente registros do cache com mais de 7 dias.
- **ResiliÃªncia e Retentativas**: Sistema de retentativas automÃ¡ticas (`retry`) com tolerÃ¢ncia a falhas na API da Gupy.
- **Zero configuraÃ§Ã£o por termo**: Adicionar ou remover uma busca Ã© uma linha na lista, sem criar arquivos.
- **Zero DependÃªncias Externas**: Utiliza estritamente a biblioteca padrÃ£o do Python (`urllib`, `json`, `datetime`, `zoneinfo`) e Vanilla JS/CSS no frontend. A Ãºnica dependÃªncia declarada em `pyproject.toml` Ã© `tzdata`, e **sÃ³ no Windows** (`sys_platform == 'win32'`), porque o sistema operacional de lÃ¡ nÃ£o tem banco de fuso horÃ¡rio â€” ver [docs/instalacao.md](docs/instalacao.md).
- **Mesmo ambiente nas trÃªs plataformas**: o [uv](https://docs.astral.sh/uv/) resolve Python, venv e dependÃªncias em um comando, e a versÃ£o do interpretador fica fixada em `.python-version` â€” a mesma do CI. `uv run monitor/main.py` funciona igual no Windows, no Linux e no macOS.
- **CI/CD com GitHub Actions**: Roda na nuvem e comita os histÃ³ricos atualizados (`vagas_vistas.json`, `vagas_recentes.json`, `vagas_gerais.json`, `vagas_descartadas.json`) de volta no repositÃ³rio.

---

## ðŸ“š DocumentaÃ§Ã£o

| Documento | ConteÃºdo |
|---|---|
| **[docs/instalacao.md](docs/instalacao.md)** | Tutorial completo: instalar o uv, clonar, preparar o ambiente, rodar o monitoramento, servir o dashboard, testes e problemas comuns. |
| **[docs/buscas-e-filtros.md](docs/buscas-e-filtros.md)** | As buscas configuradas e as duas URLs padrÃ£o, os filtros de cargo e de escopo de Ã¡rea, e como adicionar ou remover buscas e Ã¡reas. |
| **[docs/descricoes.md](docs/descricoes.md)** | As duas fontes de descriÃ§Ã£o (HTML da pÃ¡gina e texto da API), o formato do `descricoes.json` e o `backfill_descricoes.py`. |
| **[docs/automacao-ci-cd.md](docs/automacao-ci-cd.md)** | O workflow principal, o guardiÃ£o que recupera execuÃ§Ãµes descartadas, o heartbeat externo e como depurar tudo na mÃ£o. |

---

## ðŸ“ Estrutura de Pastas

A raiz do repositÃ³rio Ã© o que o **GitHub Pages serve**, entÃ£o o `index.html` precisa ficar nela. O resto Ã© separado: o front em `assets/`, os dados em `data/`, o programa de monitoramento em `monitor/` e a documentaÃ§Ã£o em `docs/`.

```text
MinhasVagas/
â”œâ”€â”€ .github/
â”‚   â””â”€â”€ workflows/
â”‚       â”œâ”€â”€ main.yml                 # Pipeline de monitoramento e commit (GitHub Actions)
â”‚       â””â”€â”€ guardiao.yml             # Recupera o disparo que o GitHub descartou
â”œâ”€â”€ docs/                            # DocumentaÃ§Ã£o (esta pasta)
â”‚   â”œâ”€â”€ instalacao.md                # Tutorial de setup e uso â€” COMECE POR AQUI
â”‚   â”œâ”€â”€ buscas-e-filtros.md          # Buscas configuradas e filtros
â”‚   â”œâ”€â”€ descricoes.md                # DescriÃ§Ãµes das vagas
â”‚   â””â”€â”€ automacao-ci-cd.md           # AutomaÃ§Ã£o no GitHub Actions
â”œâ”€â”€ monitor/                         # O programa (roda com `uv run monitor/main.py`)
â”‚   â”œâ”€â”€ consultas.py                 # LISTA DE BUSCAS (jobName, destino, rÃ³tulo, ajustes) + URLs padrÃ£o
â”‚   â”œâ”€â”€ common.py                    # API Gupy, cache, histÃ³ricos, auditoria dos descartes e os dois filtros
â”‚   â”œâ”€â”€ descricoes.py                # Filtros de cargo e de escopo + seÃ§Ãµes da descriÃ§Ã£o
â”‚   â”œâ”€â”€ backfill_descricoes.py       # Preenche o descricoes.json das vagas jÃ¡ no histÃ³rico
â”‚   â”œâ”€â”€ guardiao.py                  # Sentinela de frescor do disparo diÃ¡rio
â”‚   â”œâ”€â”€ checar_guardiao.py           # Simula as 24h de um dia contra os dois workflows
â”‚   â”œâ”€â”€ consola.py                   # UTF-8 no console (o do Windows Ã© cp1252)
â”‚   â””â”€â”€ main.py                      # Orquestrador: itera as consultas e imprime o resumo
â”œâ”€â”€ index.html                       # Interface do Dashboard (GitHub Pages) â€” precisa ficar na raiz
â”œâ”€â”€ assets/                          # O resto do front
â”‚   â”œâ”€â”€ styles.css                   # Estilos visuais e temas
â”‚   â””â”€â”€ app.js                       # LÃ³gica do Dashboard, filtros, temas, grÃ¡ficos e painel de descriÃ§Ã£o
â”œâ”€â”€ data/                            # Os dados que o app.js busca
â”‚   â”œâ”€â”€ vagas_vistas.json            # Cache de controle de IDs jÃ¡ processados
â”‚   â”œâ”€â”€ vagas_recentes.json          # HistÃ³rico dos Ãºltimos 7 dias (Vagas Tech)
â”‚   â”œâ”€â”€ vagas_gerais.json            # HistÃ³rico dos Ãºltimos 7 dias (Vagas Gerais)
â”‚   â”œâ”€â”€ vagas_descartadas.json       # Auditoria: o que os filtros cortaram, com o motivo
â”‚   â”œâ”€â”€ descricoes.json              # {id: {fonte, secoes}} â€” a partir de "Responsabilidades"
â”‚   â””â”€â”€ ultimo_monitoramento.json    # Sentinela do guardiÃ£o (data do disparo coberto)
â”œâ”€â”€ pyproject.toml                   # Projeto uv: versÃ£o do Python e dependÃªncias
â”œâ”€â”€ uv.lock                          # VersÃµes travadas (versionado de propÃ³sito)
â”œâ”€â”€ .python-version                  # Python do projeto â€” o mesmo do CI
â”œâ”€â”€ .env                             # ConfiguraÃ§Ãµes locais (ignorado no Git)
â”œâ”€â”€ .gitignore                       # ConfiguraÃ§Ã£o de arquivos ignorados pelo Git
â”œâ”€â”€ tests/                           # Testes do programa
â”‚   â”œâ”€â”€ test_filtros.py            # Testes dos filtros de cargo e de escopo
â”‚   â”œâ”€â”€ test_descartadas.py        # Testes do arquivo de auditoria dos descartes
â”‚   â””â”€â”€ test_guardiao.py           # Testes da conta de datas do guardião
â””â”€â”€ README.md                        # Este arquivo
```

---

## ðŸš€ Como Executar

O tutorial completo, com as diferenÃ§as entre Linux, Windows e macOS, estÃ¡ em
**[docs/instalacao.md](docs/instalacao.md)**. O resumo, vÃ¡lido nos trÃªs sistemas:

```bash
# 1. Instalar o uv (uma vez por mÃ¡quina) e preparar o ambiente
winget install astral-sh.uv   # Windows
uv sync

# 2. Rodar o monitoramento, a partir da raiz do repositÃ³rio
uv run monitor/main.py

# 3. Servir o dashboard (fetch() nÃ£o funciona em file://)
uv run python -m http.server 8000
```

O `uv run` Ã© o mesmo nos trÃªs sistemas e nÃ£o precisa de `.venv` ativado. Ele
tambÃ©m baixa o Python 3.11 sozinho â€” a versÃ£o fica em `.python-version` e Ã© a
mesma do CI.

O orquestrador percorre todas as consultas (cada termo Ã— presencial e remoto, com
a exceÃ§Ã£o do botÃ£o **ABC**, que Ã© sÃ³ presencial), com 1 segundo de intervalo
entre elas, e exibe um resumo ao final. Rodar duas vezes seguidas nÃ£o duplica
nada: o cache `vagas_vistas.json` filtra os IDs jÃ¡ processados.

> O `monitor/consola.py` reconfigura `stdout`/`stderr` para UTF-8 no comeÃ§o de
> cada script, entÃ£o os emojis do log aparecem corretamente tambÃ©m no console do
> Windows, que por padrÃ£o Ã© `cp1252` e quebraria o `print`.

No log, cada consulta aparece com o **termo pesquisado** e o rÃ³tulo que ela grava
(`"devops" â†’ Desenvolvimento`), porque vÃ¡rias buscas compartilham o mesmo rÃ³tulo.
O **resumo final** Ã© separado por destino e agrupado por Ã¡rea:

```text
Descartadas 8 vaga(s) por estÃ¡gio fora da Ã¡rea de tech para ["estagio" â†’ EstÃ¡gio].
Descartadas 3 vaga(s) por cargo avanÃ§ado para ["Suporte" â†’ Suporte].

ðŸ“Š VAGAS TECH â€” novas por Ã¡rea (vagas_recentes.json)
============================================================
  â€¢ Desenvolvimento         72      <- dev + software + devops + sistemas
  â€¢ EstÃ¡gio                66      <- estagio + estagiario
  â€¢ Suporte                24
  â€¢ TI                     14
============================================================
```

"Sistemas" entra dentro de "Desenvolvimento" porque o botÃ£o **Dev** do dashboard
jÃ¡ cobre os dois. Se uma busca falhar, a Ã¡rea aparece marcada como
`(N busca(s) com erro)` e o detalhe continua na linha da consulta.

As linhas de "Descartadas" dizem **o motivo** e nÃ£o sÃ³ o total, porque os dois
filtros descartam por razÃµes diferentes: Ã© assim que se vÃª se o nÃºmero grande vem
do cargo avanÃ§ado ou do estÃ¡gio fora da Ã¡rea de tech.

### Testes

Rodam sem rede e sem tocar em `data/`:

```bash
python -m unittest discover -s tests -p 'test_*.py'
```

---

## âš™ï¸ ConfiguraÃ§Ã£o do Ambiente

O projeto **nÃ£o depende de nenhuma credencial externa**. A API da Gupy Ã©
consultada sem autenticaÃ§Ã£o e os resultados sÃ£o gravados em arquivos JSON
versionados no repositÃ³rio.

A Ãºnica configuraÃ§Ã£o opcional Ã© o `.env` na raiz, carregado por `carregar_env()`
em `monitor/common.py`. Como nÃ£o hÃ¡ mais integraÃ§Ã£o com o Telegram, ele pode ser
removido com seguranÃ§a, assim como o bloco `env:` correspondente em
`.github/workflows/main.yml`.

---

## ðŸ”„ AutomaÃ§Ã£o ContÃ­nua (CI/CD)

O workflow em `.github/workflows/main.yml` roda **todo dia Ã s 18h30** (horÃ¡rio de
BrasÃ­lia) e tambÃ©m pode ser disparado manualmente pela aba **Actions**: faz
checkout, configura Python 3.11, roda `python monitor/main.py`, registra o
disparo e comita os arquivos atualizados de `data/` de volta no repositÃ³rio.

Um segundo workflow, `guardiao.yml`, roda a cada 3 horas para recuperar os
disparos que o GitHub descarta. Os detalhes de ambos, e do heartbeat externo, estÃ£o
em **[docs/automacao-ci-cd.md](docs/automacao-ci-cd.md)**.

---

## ðŸ› ï¸ Modificando o Projeto

- **Adicionar ou remover uma busca**: uma linha na lista `BUSCAS` em
  `monitor/consultas.py`. Ver [docs/buscas-e-filtros.md](docs/buscas-e-filtros.md).
- **Adicionar ou remover uma Ã¡rea do filtro**: editar `AREAS_FORA_DE_TECH` em
  `monitor/descricoes.py`. Ver [docs/buscas-e-filtros.md](docs/buscas-e-filtros.md).
- **Criar um botÃ£o novo no dashboard**: a linha em `BUSCAS`, o `<button>` em
  `index.html` e o `case` correspondente no `switch` de `assets/app.js`.

> **Importante:** o dashboard filtra as vagas pelo campo `topic`, que recebe o
> rÃ³tulo definido em `BUSCAS`. Ao criar um termo novo, escolha um rÃ³tulo que nÃ£o
> colida com os filtros de cargo jÃ¡ existentes (`suporte`, `ti`, `infra`,
> `service desk`, `jÃºnior`, `help desk`, `jr`, `auxiliar`, `abc`, `banco de
> talentos`, `administrativo`, `almoxarifado`) â€” o filtro de "Vagas Tech" faz
> busca por substring e poderia capturar o termo novo por acidente.