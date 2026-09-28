# 🤖 MinhasVagas - Dashboard e Monitoramento de Vagas Gupy

Sistema automatizado em Python para monitoramento periódico de vagas na plataforma **Gupy**, com deduplicação global e **Dashboard Web interativo** hospedado no GitHub Pages.

---

## 📌 Funcionalidades

- **Dashboard Web Moderno**:
  - **Aba "Vagas Tech"**: Exibe exclusivamente as vagas de tecnologia com filtros rápidos por área (**Suporte**, **Estágio**, **Dev**, **TI**, **Outras**) e busca textual em tempo real. O botão **Dev** engloba também as vagas de sistemas; o botão **Outras** agrupa Infraestrutura, Help Desk e Service Desk.
  - **Aba "Vagas Gerais"**: Exibe vagas gerais da Grande SP e Remotas em arquivo dedicado (`vagas_gerais.json`), com separação clara entre vagas **Presenciais** e **Remotas** e visualização agrupada em seções.
  - **Sub-abas "Últimos 2 dias" / "Não candidatadas" / "Todas"**: Disponíveis dentro de "Vagas Tech" e "Vagas Gerais", nessa ordem, com **"Últimos 2 dias"** como padrão ao abrir a página.
    - **Últimos 2 dias**: combina os filtros de cargo com a janela de **hoje + ontem** (dias do calendário, calculada em `calcularJanelaRecente()` em `assets/app.js` com o fuso horário local do navegador — do início de ontem até o início de amanhã), mostrando apenas vagas publicadas nesse período e para as quais você ainda **não** se candidatou, ordenadas da mais recente para a mais antiga.
    - **Não candidatadas**: o mesmo conjunto da aba **Todas** (sem corte de data e sem reordenar), removendo apenas as vagas para as quais você já se candidatou.
    - **Todas**: histórico completo, sem nenhum filtro de data ou candidatura.
  - **Aba "Horários de Postagem"**: Gráfico analítico de distribuição de publicações por hora, pico e períodos do dia, calculado estritamente com base nas **vagas de tecnologia**.
  - **Personalização de Temas**: 8 opções de cores de tema persistidas no navegador (Vermelho, Azul, Verde, Roxo, Laranja, Teal, Índigo, Rosa).
  - **Marcação de Candidaturas**: Controle local com checkbox "Candidatei-me" salvo no `localStorage`.
    - As listas de "Últimos 2 dias" e "Não candidatadas" são **instantâneos do carregamento da página**: marcar/desmarcar "Candidatei-me" (ou clicar em "Candidatar-se") mantém o card visível na tela e apenas o destaca, sem removê-lo da lista. A vaga só desaparece dessas abas no **próximo carregamento da página** (F5), momento em que o snapshot `state.appliedAtLoad` é refeito a partir do `localStorage`. Na aba **Todas** a vaga permanece visível sempre.
  - **Painel de Descrição da Vaga**: O botão **"Ver descrição"** no rodapé de cada card abre uma sobreposição pela direita com a vaga organizada em seções — **Responsabilidades**, **Requisitos**, **Informações adicionais**, **Benefícios**, **Salário**, **Jornada de trabalho** e **Local de trabalho** — em lista formatada. O texto vem do campo `description` da API, lido a partir de "Responsabilidades e Atribuições" até o fim da descrição.
    - O arquivo `data/descricoes.json` é baixado **sob demanda**, só no primeiro clique: ele pesa ~380 KB (gzip) e não é necessário para listar as vagas, então o carregamento da página continua igual.
    - Fecha pelo botão **✕**, pelo clique fora do painel ou pela tecla **Esc**.
    - ~8% das vagas não trazem a seção "Responsabilidades" em texto (usam "Sobre a oportunidade", "O que buscamos?"…): nesses casos o painel avisa e mantém o botão **Candidatar-se →** para a vaga original.
- **Buscas Configuráveis**: Todos os termos monitorados ficam centralizados em uma única lista (`BUSCAS` em `monitor/consultas.py`). Cada termo gera uma consulta presencial e uma remota a partir de duas URLs padrão.
- **Isolamento de Dados**: Separação física entre o histórico de tech (`vagas_recentes.json`) e vagas gerais (`vagas_gerais.json`).
- **Ordem de Execução**: Os termos de tech rodam primeiro, garantindo prioridade no registro do cache (`vagas_vistas.json`) e evitando que vagas técnicas sejam duplicadas na listagem geral.
- **Deduplicação Global**: Armazena o ID original de cada vaga no arquivo de histórico (`vagas_vistas.json`). Se a mesma vaga for encontrada por termos diferentes, ela só é registrada na primeira consulta que a encontrar.
- **Filtro de Cargo**: Vagas de nível avançado são descartadas antes de entrar no histórico: **sênior/sr**, **pleno/pl**, **especialista**, **gerente**, **diretor**, **coordenador**, **supervisor** e **líder**. O corte é pelo **título** da vaga, em `cargo_para_descartar()` (`monitor/descricoes.py`) — a API da Gupy não aceita exclusão (`excludeTerms` é ignorado, e `jobName=dev -senior` devolve outro conjunto).
  - O título da vaga mistura **cargo** e **área**, e errar para o lado de descartar apaga oportunidade sem a pessoa nunca ver. Por isso o filtro tem três partes: o **cargo** (`Coordenador de Compras`, `Supervisor`, incluindo feminino e plural), a **área** (`Coordenação`, `Supervisão`, `Gerência`) e o **PL** (que só conta quando não é `PL/SQL`, dialeto de banco). Tudo com acento ignorado e palavra inteira, senão "Sr" casaria dentro de outras palavras.
  - Duas regras evitam falso positivo: quem aceita os dois níveis é mantido (`Fullstack AI Engineer - (JR/PL)`, `Advogado(a) Júnior/Pleno`), e **cargo de entrada no começo do título** também (`Assistente de Coordenação Pedagógica` é vaga de assistente, não de coordenador).
  - A vaga descartada entra no `vagas_vistas.json` para não ser re-avaliada a cada rodada, mas não vai para o histórico nem para o dashboard. O terminal avisa: `Descartadas N vaga(s) de cargo avançado`.
  - O corte também roda na limpeza do histórico, então as vagas de cargo avançado que já estavam gravadas saem na próxima execução.
- **Filtro de Recorrência**: Considera apenas vagas publicadas nos últimos 4 dias e limpa automaticamente registros do cache com mais de 7 dias.
- **Resiliência e Retentativas**: Sistema de retentativas automáticas (`retry`) com tolerância a falhas na API da Gupy.
- **Zero configuração por termo**: Adicionar ou remover uma busca é uma linha na lista, sem criar arquivos.
- **Zero Dependências Externas**: Utiliza estritamente a biblioteca padrão do Python (`urllib`, `json`, `datetime`, `zoneinfo`) e Vanilla JS/CSS no frontend.
- **CI/CD com GitHub Actions**: Roda na nuvem e comita os históricos atualizados (`vagas_vistas.json`, `vagas_recentes.json`, `vagas_gerais.json`) de volta no repositório.

---

## 📁 Estrutura de Pastas

A raiz do repositório é o que o **GitHub Pages serve**, então o `index.html` precisa ficar nela. O resto é separado: o front em `assets/`, os dados em `data/` e o programa de monitoramento em `monitor/`.

```text
MinhasVagas/
├── .github/
│   └── workflows/
│       └── main.yml               # Pipeline de monitoramento e commit (GitHub Actions)
├── monitor/                       # O programa (roda com `python monitor/main.py`)
│   ├── consultas.py               # LISTA DE BUSCAS (jobName, destino, rótulo) + URLs padrão
│   ├── common.py                  # API Gupy, cache, histórico, limpeza e filtro de cargo
│   ├── descricoes.py              # Filtro de cargo + seções da descrição e o descricoes.json
│   ├── backfill_descricoes.py     # Preenche o descricoes.json das vagas que já estão no histórico
│   └── main.py                    # Orquestrador: itera as consultas e imprime o resumo
├── index.html                     # Interface do Dashboard (GitHub Pages) — precisa ficar na raiz
├── assets/                        # O resto do front
│   ├── styles.css                 # Estilos visuais e temas
│   └── app.js                     # Lógica do Dashboard, filtros, temas, gráficos e painel de descrição
├── data/                          # Os dados que o app.js busca
│   ├── vagas_vistas.json          # Cache de controle de IDs já processados
│   ├── vagas_recentes.json        # Histórico dos últimos 7 dias (Vagas Tech)
│   ├── vagas_gerais.json          # Histórico dos últimos 7 dias (Vagas Gerais)
│   └── descricoes.json            # {id: {fonte, secoes}} — a partir de "Responsabilidades"
├── .env                           # Configurações locais (ignorado no Git)
├── .gitignore                     # Configuração de arquivos ignorados pelo Git
└── README.md                      # Documentação do projeto
```

---

## 🧭 Buscas Configuradas

Todas as buscas vivem na lista `BUSCAS` de `monitor/consultas.py`. Cada linha gera **duas** consultas: uma presencial (Grande SP) e uma remota.

**A ordem da lista importa.** A primeira busca que encontra uma vaga define o rótulo dela — as demais são ignoradas pela deduplicação de ID. Por isso a lista segue a ordem dos botões do dashboard: tech primeiro, gerais depois, e a busca ampla por último.

#### Botões da aba "Vagas Tech" — `Suporte · Estágio · Dev · TI · Outras`

| Termo (`jobName`) | Destino | Rótulo no card | Botão |
|---|---|---|---|
| `Suporte` | `tech` | `Suporte` / `Suporte Remoto` | Suporte |
| `estagio` | `tech` | `Estágio` / `Estágio Remoto` | Estágio |
| `estagiario` | `tech` | `Estágio` / `Estágio Remoto` | Estágio |
| `desenvolvedor` | `tech` | `Desenvolvimento` / `Desenvolvimento Remoto` | Dev |
| `desenvolvimento` | `tech` | `Desenvolvimento` / `Desenvolvimento Remoto` | Dev |
| `dev` | `tech` | `Desenvolvimento` / `Desenvolvimento Remoto` | Dev |
| `software` | `tech` | `Desenvolvimento` / `Desenvolvimento Remoto` | Dev |
| `devops` | `tech` | `Desenvolvimento` / `Desenvolvimento Remoto` | Dev |
| `sistemas` | `tech` | `Sistemas` / `Sistemas Remoto` | Dev |
| `TI` | `tech` | `TI` / `TI Remoto` | TI |
| `tecnologia` | `tech` | `TI` / `TI Remoto` | TI |
| `infra` | `tech` | `Outras` / `Outras Remoto` | Outras |
| `help desk` | `tech` | `Outras` / `Outras Remoto` | Outras |
| `service desk` | `tech` | `Outras` / `Outras Remoto` | Outras |

#### Botões da aba "Vagas Gerais" — `Assistente · Júnior · Auxiliar · Remoto · Presencial`

| Termo (`jobName`) | Destino | Rótulo no card | Botão |
|---|---|---|---|
| `assistente` | `geral` | `Assistente Presencial` / `Assistente Remoto` | Assistente |
| `jr` | `geral` | `Júnior` / `Júnior Remoto` | Júnior |
| `Júnior` | `geral` | `Júnior` / `Júnior Remoto` | Júnior |
| `auxiliar` | `geral` | `Auxiliar Presencial` / `Auxiliar Remoto` | Auxiliar |
| *(vazio)* | `geral` | `Geral Presencial` / `Geral Remoto` | Remoto / Presencial |

> O termo vazio (`None`) não usa `jobName` na URL: é a busca ampla, que captura qualquer vaga publicada nas cidades monitoradas, inclusive as que nenhum outro termo encontra. Por vir por último, ela só rotula as vagas que sobraram — as vagas de um cargo específico já foram rotuladas antes e não caem aqui.

### Termos que a API resolve sozinha

A busca da Gupy é por radical e ignora acentos, o que evita variantes duplicadas:

| Termo usado | Cobre automaticamente | Como foi verificado |
|---|---|---|
| `desenvolvedor` | `desenvolvedora` | conjuntos de IDs idênticos |
| `sistemas` | `sistema` | conjuntos de IDs idênticos |

Já `estagiario`, `desenvolvimento` e `dev` **não** são cobertos por `estagio` e `desenvolvedor` — os conjuntos de IDs são totalmente disjuntos, então cada um precisa de busca própria. É por isso que o botão **Estágio** usa `estagio` + `estagiario`, e o botão **Dev** usa `desenvolvedor` + `desenvolvimento` + `dev` + `software` + `devops`.

### As duas URLs padrão

```text
Presencial: https://portal.gupy.io/api/job-search/jobs?limit=100&offset=0&city=<CIDADES>&state=São Paulo
Remoto:     https://portal.gupy.io/api/job-search/jobs?limit=100&offset=0&workplaceType=remote
```

O `jobName` é acrescentado a uma delas conforme o termo. O `limit=100` é o teto aceito pela API (acima disso retorna HTTP 400) e, como os resultados vêm ordenados por data de publicação, `offset=0` já traz as vagas mais recentes.

---

## ⚙️ Configuração do Ambiente

O projeto **não depende de nenhuma credencial externa**. A API da Gupy é consultada sem autenticação e os resultados são gravados em arquivos JSON versionados no repositório.

A única configuração opcional é o `.env` na raiz, carregado por `carregar_env()` em `monitor/common.py`. Como não há mais integração com o Telegram, ele pode ser removido com segurança, assim como o bloco `env:` correspondente em `.github/workflows/main.yml`.

---

## 🚀 Como Executar

```bash
python monitor/main.py
```

Rode a partir da raiz do repositório: o programa lê e escreve os `.json` dali, e é assim que o GitHub Actions chama (`python monitor/main.py`).

O orquestrador percorre todas as consultas (cada termo × presencial e remoto), com 1 segundo de intervalo entre elas, e exibe um resumo ao final. Rodar duas vezes seguidas não duplica nada: o cache `vagas_vistas.json` filtra os IDs já processados.

No log, cada consulta aparece com o **termo pesquisado** e o rótulo que ela grava (`"devops" → Desenvolvimento`), porque várias buscas compartilham o mesmo rótulo. O **resumo final** é separado por destino e agrupado por área:

```text
📊 VAGAS TECH — novas por área (data/vagas_recentes.json)
============================================================
  • Desenvolvimento         72      <- dev + software + devops + sistemas
  • Estágio                 66      <- estagio + estagiario
  • Suporte                 24
  • TI                      14
```

"Sistemas" entra dentro de "Desenvolvimento" porque o botão **Dev** do dashboard já cobre os dois. Se uma busca falhar, a área aparece marcada como `(N busca(s) com erro)` e o detalhe continua na linha da consulta.

Para inspecionar as URLs que serão consultadas, sem chamar a API:

```bash
cd monitor
python -c "
from consultas import gerar_consultas
for c in gerar_consultas():
    print(c.rotulo_exibicao, '->', c.url)
"
```

---

## 📄 Descrições das Vagas

O campo `description` da API não vai para `vagas_recentes.json`/`vagas_gerais.json`. A descrição é organizada em seções por `monitor/descricoes.py` e gravada em `descricoes.json`:

```json
{
  "12459795": {
    "fonte": "html",
    "secoes": [
      { "titulo": "Responsabilidades", "blocos": [
        { "tipo": "item", "texto": "O estagiário dará suporte às ações de Desenvolvimento:" },
        { "tipo": "item", "texto": "Entendimento das demandas;" } ] },
      { "titulo": "Requisitos", "blocos": [
        { "tipo": "subtitulo", "texto": "Obrigatório" },
        { "tipo": "item", "texto": "Cursando Ensino Superior" } ] }
    ]
  }
}
```

O painel mostra cada seção com seu título e cada bloco como foi escrito na vaga: `item` vira bullet, `subtitulo` vira rótulo em negrito e `texto` vira parágrafo.

### As duas fontes, e por que

**1. O HTML da página da vaga (`fonte: "html"`, ~70% dos casos).** O `jobUrl` da vaga publica a descrição em HTML no JSON-LD `JobPosting` (schema.org) — o mesmo HTML que a Gupy renderiza, com `<h2>` de seção, `<li>` de item e `<strong>` de subtítulo. É essa fonte que reproduz a leitura original.

**2. O texto `description` da API (`fonte: "texto"`, o resto).** Mesmo conteúdo, mas "achatado": os títulos viram texto colado no item anterior e a marcação some. Exemplo real de uma reserva:

```text
…Responsabilidades e atribuiçõesO estagiário dará suporte às ações de
Desenvolvimento:Entendimento das demandas;Realizar documentações técnicas;
Desenvolvimento em Java/.NET (C#);…Requisitos e qualificaçõesObrigatório…
```

Nessa fonte a leitura é feita por texto, em três passos de `extrair_secoes_texto()`:

1. **Começa** em "Responsabilidades e Atribuições" (com ou sem acento, "Principais responsabilidades") e vai **até o fim da descrição** — é isso que dá responsável, requisitos, informações adicionais e benefícios.
2. **Quebra em seções** nos títulos conhecidos ("Requisitos e qualificações", "Informações adicionais", "Benefícios", "Salário", "Jornada de trabalho", "Local de trabalho"), aceitando com ou sem acento e renomeando para um título único no painel.
3. **Quebra em itens** por `;`, quebra de linha, marcadores (`•`, `➢`), fim de frase seguido de maiúscula e `&nbsp;` — esse último só quando o trecho anterior já parece completo, para não cortar frase ao meio.

Em ambos os casos a leitura só começa em "Responsabilidades": o texto de marketing que vem antes fica de fora. Vagas que não têm a seção (poucas) mostram um aviso no painel com o link para a vaga original.

O arquivo é reescrito a cada execução de `main.py` com **apenas os IDs que continuam nos dois históricos** (`sincronizar_descricoes()`), então ele acompanha a retenção de 7 dias e não cresce para sempre.

### Por que as páginas são buscadas em paralelo

Cada vaga é uma requisição independente, e a espera é de rede, não de CPU: medido, um lote de 60 vagas consome **6,6% de um núcleo** enquanto 8 workers esperam resposta. Threads são a ferramenta certa para isso — e `asyncio` só ganharia algo se trocássemos `urllib` por uma dependência externa, o que o projeto não faz.

| | por vaga | 600 vagas |
|---|---|---|
| sequencial | 0,57 s | ~5,7 min |
| 8 workers | **0,07 s** | **~45 s** (medido) |

O número está em `TRABALHADORES_PAGINA`, em `monitor/descricoes.py`; baixe para 4 se algum dia aparecer erro de requisição em massa. Nada mais na execução usa threads: as 40 buscas da API continuam sequenciais com 1 s de intervalo, porque ali o intervalo é proteção contra rate limit.

> Um portal fora do ar não trava a execução: o `timeout` é de 12 s e, depois de 2 falhas no mesmo domínio, o código desiste dele e usa o texto da API.

> Os portais que não publicam o JSON-LD (Itaú, Stefanini, Atento, Clicksign…) também não expõem a descrição por API: o `__NEXT_DATA__` do Next.js devolve só a introduction, truncada. Por isso essas vagas usam o texto da API — usar a versão truncada apagaria requisitos e benefícios.

### Recarregar as vagas que já estão no histórico

A descrição só é lida no instante em que a vaga é nova — depois a deduplicação de `vagas_vistas.json` impede a vaga de voltar da API. Para preencher as vagas que já estavam no histórico:

```bash
python monitor/backfill_descricoes.py
```

O script refaz as mesmas buscas de `monitor/consultas.py`, casa o resultado por ID, busca o HTML de cada página e grava o que encontrar. São ~600 requisições (uma por vaga, com intervalo), então leva alguns minutos. É seguro rodar quantas vezes quiser: ele não toca nos dois arquivos de histórico, só reescreve o `descricoes.json`. Vale a pena rodar de novo sempre que a extração melhorar.

---

## 🔄 Automação Contínua (CI/CD)

O workflow configurado em `.github/workflows/main.yml` pode ser disparado manualmente pela aba **Actions** do GitHub:

1. Faz checkout do código.
2. Configura o ambiente Python 3.11.
3. Executa `python monitor/main.py`.
4. Salva e comita automaticamente os arquivos atualizados de `data/` (`vagas_vistas.json`, `vagas_recentes.json`, `vagas_gerais.json`, `descricoes.json`) no repositório.

---

## 🛠️ Como Adicionar ou Remover uma Busca

Basta editar a lista `BUSCAS` em `monitor/consultas.py`. **Nenhum arquivo novo é preciso.**

```python
BUSCAS = [
    # tech, na ordem dos botões: Suporte > Estágio > Dev > TI > Outras
    ("Suporte",         "tech",  "Suporte"),
    ("estagio",         "tech",  "Estágio"),
    ("estagiario",      "tech",  "Estágio"),
    ("desenvolvedor",   "tech",  "Desenvolvimento"),
    ("desenvolvimento", "tech",  "Desenvolvimento"),
    ("dev",             "tech",  "Desenvolvimento"),
    ("software",        "tech",  "Desenvolvimento"),
    ("devops",          "tech",  "Desenvolvimento"),
    ("sistemas",        "tech",  "Sistemas"),
    ("TI",              "tech",  "TI"),
    ("tecnologia",      "tech",  "TI"),
    ("infra",           "tech",  "Outras"),
    ("help desk",       "tech",  "Outras"),
    ("service desk",    "tech",  "Outras"),
    # gerais, na ordem dos botões: Assistente > Júnior > Auxiliar > Remoto > Presencial
    ("assistente",      "geral", "Assistente Presencial"),
    ("jr",              "geral", "Júnior"),
    ("Júnior",          "geral", "Júnior"),
    ("auxiliar",        "geral", "Auxiliar Presencial"),
    (None,              "geral", "Geral Presencial"),
]
```

Cada linha é `(jobName, destino, rótulo presencial)`:

* **`jobName`** — termo enviado como `?jobName=`. Use `None` para a busca ampla, sem filtro de nome.
* **`destino`** — `"tech"` grava em `data/vagas_recentes.json` (aba **Vagas Tech**); `"geral"` grava em `data/vagas_gerais.json` (aba **Vagas Gerais**).
* **`rótulo`** — texto exibido no card e usado pelos filtros do dashboard. A variante remota é derivada automaticamente: `"Suporte"` → `"Suporte Remoto"`, `"Assistente Presencial"` → `"Assistente Remoto"`.

Vários termos podem compartilhar o mesmo rótulo: é assim que `infra`, `help desk` e `service desk` aparecem juntos no botão **Outras**, e como `jr` e `Júnior` se fundem no botão **Júnior**. Para criar um botão novo no dashboard, além da linha em `BUSCAS` é preciso adicionar o `<button>` em `index.html` e o `case` correspondente no `switch` de `assets/app.js`.

> **Importante:** o dashboard filtra as vagas pelo campo `topic`, que recebe esse rótulo. Ao criar um termo novo, escolha um rótulo que não colida com os filtros de cargo já existentes (`suporte`, `ti`, `infra`, `service desk`, `júnior`, `help desk`, `jr`, `assistente`, `auxiliar`) — o filtro de "Vagas Tech" faz busca por substring e poderia capturar o termo novo por acidente.
