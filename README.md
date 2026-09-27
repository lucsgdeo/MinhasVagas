# 🤖 MinhasVagas - Dashboard e Monitoramento de Vagas Gupy

Sistema automatizado em Python para monitoramento periódico de vagas na plataforma **Gupy**, com deduplicação global e **Dashboard Web interativo** hospedado no GitHub Pages.

---

## 📌 Funcionalidades

- **Dashboard Web Moderno**:
  - **Aba "Vagas Tech"**: Exibe exclusivamente as vagas de tecnologia (Suporte, TI, Infra, Service Desk, Júnior, Help Desk, JR) com filtros rápidos por cargo e busca textual em tempo real.
  - **Aba "Vagas Gerais"**: Exibe vagas gerais da Grande SP e Remotas em arquivo dedicado (`vagas_gerais.json`), com separação clara entre vagas **Presenciais** e **Remotas** e visualização agrupada em seções.
  - **Sub-abas "Últimos 2 dias" / "Não candidatadas" / "Todas"**: Disponíveis dentro de "Vagas Tech" e "Vagas Gerais", nessa ordem, com **"Últimos 2 dias"** como padrão ao abrir a página.
    - **Últimos 2 dias**: combina os filtros de cargo com a janela de **hoje + ontem** (dias do calendário, calculada em `calcularJanelaRecente()` no `app.js` com o fuso horário local do navegador — do início de ontem até o início de amanhã), mostrando apenas vagas publicadas nesse período e para as quais você ainda **não** se candidatou, ordenadas da mais recente para a mais antiga.
    - **Não candidatadas**: o mesmo conjunto da aba **Todas** (sem corte de data e sem reordenar), removendo apenas as vagas para as quais você já se candidatou.
    - **Todas**: histórico completo, sem nenhum filtro de data ou candidatura.
  - **Aba "Horários de Postagem"**: Gráfico analítico de distribuição de publicações por hora, pico e períodos do dia, calculado estritamente com base nas **vagas de tecnologia**.
  - **Personalização de Temas**: 8 opções de cores de tema persistidas no navegador (Vermelho, Azul, Verde, Roxo, Laranja, Teal, Índigo, Rosa).
  - **Marcação de Candidaturas**: Controle local com checkbox "Candidatei-me" salvo no `localStorage`.
    - As listas de "Últimos 2 dias" e "Não candidatadas" são **instantâneos do carregamento da página**: marcar/desmarcar "Candidatei-me" (ou clicar em "Candidatar-se") mantém o card visível na tela e apenas o destaca, sem removê-lo da lista. A vaga só desaparece dessas abas no **próximo carregamento da página** (F5), momento em que o snapshot `state.appliedAtLoad` é refeito a partir do `localStorage`. Na aba **Todas** a vaga permanece visível sempre.
- **Buscas Configuráveis**: Todos os termos monitorados ficam centralizados em uma única lista (`BUSCAS` em `consultas.py`). Cada termo gera uma consulta presencial e uma remota a partir de duas URLs padrão.
- **Isolamento de Dados**: Separação física entre o histórico de tech (`vagas_recentes.json`) e vagas gerais (`vagas_gerais.json`).
- **Ordem de Execução**: Os termos de tech rodam primeiro, garantindo prioridade no registro do cache (`vagas_vistas.json`) e evitando que vagas técnicas sejam duplicadas na listagem geral.
- **Deduplicação Global**: Armazena o ID original de cada vaga no arquivo de histórico (`vagas_vistas.json`). Se a mesma vaga for encontrada por termos diferentes, ela só é registrada na primeira consulta que a encontrar.
- **Filtro de Recorrência**: Considera apenas vagas publicadas nos últimos 4 dias e limpa automaticamente registros do cache com mais de 7 dias.
- **Resiliência e Retentativas**: Sistema de retentativas automáticas (`retry`) com tolerância a falhas na API da Gupy.
- **Zero configuração por termo**: Adicionar ou remover uma busca é uma linha na lista, sem criar arquivos.
- **Zero Dependências Externas**: Utiliza estritamente a biblioteca padrão do Python (`urllib`, `json`, `datetime`, `zoneinfo`) e Vanilla JS/CSS no frontend.
- **CI/CD com GitHub Actions**: Roda na nuvem e comita os históricos atualizados (`vagas_vistas.json`, `vagas_recentes.json`, `vagas_gerais.json`) de volta no repositório.

---

## 📁 Estrutura de Pastas

```text
MinhasVagas/
├── .github/
│   └── workflows/
│       └── main.yml               # Pipeline de monitoramento e commit (GitHub Actions)
├── consultas.py                   # LISTA DE BUSCAS (jobName, destino, rótulo) + URLs padrão
├── common.py                      # API Gupy, cache, histórico e limpeza
├── main.py                        # Orquestrador: itera as consultas e imprime o resumo
├── index.html                     # Interface do Dashboard (GitHub Pages)
├── styles.css                     # Estilos visuais e temas
├── app.js                         # Lógica do Dashboard, filtros, temas e gráficos
├── vagas_vistas.json              # Cache de controle de IDs já processados
├── vagas_recentes.json            # Histórico dos últimos 7 dias (Vagas Tech)
├── vagas_gerais.json              # Histórico dos últimos 7 dias (Vagas Gerais)
├── .env                           # Configurações locais (ignorado no Git)
├── .gitignore                     # Configuração de arquivos ignorados pelo Git
└── README.md                      # Documentação do projeto
```

---

## 🧭 Buscas Configuradas

Todas as buscas vivem na lista `BUSCAS` de `consultas.py`. Cada linha gera **duas** consultas: uma presencial (Grande SP) e uma remota.

| Termo (`jobName`) | Destino | Arquivo gerado | Rótulo no card |
|---|---|---|---|
| `Suporte` | `tech` | `vagas_recentes.json` | `Suporte` / `Suporte Remoto` |
| `TI` | `tech` | `vagas_recentes.json` | `TI` / `TI Remoto` |
| `infra` | `tech` | `vagas_recentes.json` | `Infraestrutura` / `Infraestrutura Remoto` |
| `Service Desk` | `tech` | `vagas_recentes.json` | `Service Desk` / `Service Desk Remoto` |
| `Júnior` | `tech` | `vagas_recentes.json` | `Júnior` / `Júnior Remoto` |
| `Help Desk` | `tech` | `vagas_recentes.json` | `Help Desk` / `Help Desk Remoto` |
| `jr` | `tech` | `vagas_recentes.json` | `JR` / `JR Remoto` |
| `assistente` | `geral` | `vagas_gerais.json` | `Assistente Presencial` / `Assistente Remoto` |
| `auxiliar` | `geral` | `vagas_gerais.json` | `Auxiliar Presencial` / `Auxiliar Remoto` |
| *(vazio)* | `geral` | `vagas_gerais.json` | `Geral Presencial` / `Geral Remoto` |

> O termo vazio (`None`) não usa `jobName` na URL: é a busca ampla, que captura qualquer vaga publicada nas cidades monitoradas, inclusive as que nenhum outro termo encontra.

### As duas URLs padrão

```text
Presencial: https://portal.gupy.io/api/job-search/jobs?limit=100&offset=0&city=<CIDADES>&state=São Paulo
Remoto:     https://portal.gupy.io/api/job-search/jobs?limit=100&offset=0&workplaceType=remote
```

O `jobName` é acrescentado a uma delas conforme o termo. O `limit=100` é o teto aceito pela API (acima disso retorna HTTP 400) e, como os resultados vêm ordenados por data de publicação, `offset=0` já traz as vagas mais recentes.

---

## ⚙️ Configuração do Ambiente

O projeto **não depende de nenhuma credencial externa**. A API da Gupy é consultada sem autenticação e os resultados são gravados em arquivos JSON versionados no repositório.

A única configuração opcional é o `.env` na raiz, carregado por `carregar_env()` em `common.py`. Como não há mais integração com o Telegram, ele pode ser removido com segurança, assim como o bloco `env:` correspondente em `.github/workflows/main.yml`.

---

## 🚀 Como Executar

```bash
python main.py
```

O orquestrador percorre todas as consultas (cada termo × presencial e remoto), com 1 segundo de intervalo entre elas, e exibe um resumo ao final. Rodar duas vezes seguidas não duplica nada: o cache `vagas_vistas.json` filtra os IDs já processados.

Para inspecionar as URLs que serão consultadas, sem chamar a API:

```python
from consultas import gerar_consultas
for c in gerar_consultas():
    print(c.rotulo, "->", c.url)
```

---

## 🔄 Automação Contínua (CI/CD)

O workflow configurado em `.github/workflows/main.yml` pode ser disparado manualmente pela aba **Actions** do GitHub:

1. Faz checkout do código.
2. Configura o ambiente Python 3.11.
3. Executa `python main.py`.
4. Salva e comita automaticamente os históricos atualizados (`vagas_vistas.json`, `vagas_recentes.json`, `vagas_gerais.json`) no repositório.

---

## 🛠️ Como Adicionar ou Remover uma Busca

Basta editar a lista `BUSCAS` em `consultas.py`. **Nenhum arquivo novo é preciso.**

```python
BUSCAS = [
    ("Suporte",      "tech",  "Suporte"),
    ("TI",           "tech",  "TI"),
    ("infra",        "tech",  "Infraestrutura"),
    ("Service Desk", "tech",  "Service Desk"),
    ("Júnior",       "tech",  "Júnior"),
    ("Help Desk",    "tech",  "Help Desk"),
    ("jr",           "tech",  "JR"),
    ("assistente",   "geral", "Assistente Presencial"),
    ("auxiliar",     "geral", "Auxiliar Presencial"),
    (None,           "geral", "Geral Presencial"),
    ("seguranca",    "geral", "Segurança"),   # <- nova busca
]
```

Cada linha é `(jobName, destino, rótulo presencial)`:

* **`jobName`** — termo enviado como `?jobName=`. Use `None` para a busca ampla, sem filtro de nome.
* **`destino`** — `"tech"` grava em `vagas_recentes.json` (aba **Vagas Tech**); `"geral"` grava em `vagas_gerais.json` (aba **Vagas Gerais**).
* **`rótulo`** — texto exibido no card e usado pelos filtros do dashboard. A variante remota é derivada automaticamente: `"Suporte"` → `"Suporte Remoto"`, `"Assistente Presencial"` → `"Assistente Remoto"`.

> **Importante:** o dashboard filtra as vagas pelo campo `topic`, que recebe esse rótulo. Ao criar um termo novo, escolha um rótulo que não colida com os filtros de cargo já existentes (`suporte`, `ti`, `infra`, `service desk`, `júnior`, `help desk`, `jr`, `assistente`, `auxiliar`) — o filtro de "Vagas Tech" faz busca por substring e poderia capturar o termo novo por acidente.
