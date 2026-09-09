# 🤖 MinhasVagas - Dashboard e Monitoramento de Vagas Gupy

Sistema automatizado em Python para monitoramento periódico de vagas na plataforma **Gupy**, com deduplicação global, envio de alertas no **Telegram** e **Dashboard Web interativo** hospedado no GitHub Pages.

---

## 📌 Funcionalidades

- **Dashboard Web Moderno**:
  - **Aba "Vagas Tech"**: Exibe exclusivamente as vagas de tecnologia (Suporte, TI, Infra, Service Desk, Júnior, Help Desk, JR) com filtros rápidos por cargo e busca textual em tempo real.
  - **Aba "Vagas Gerais"**: Exibe vagas gerais da Grande SP e Remotas em arquivo dedicado (`vagas_gerais.json`), com separação clara entre vagas **Presenciais** e **Remotas** e visualização agrupada em seções.
  - **Aba "Horários de Postagem"**: Gráfico analítico de distribuição de publicações por hora, pico e períodos do dia, calculado estritamente com base nas **vagas de tecnologia**.
  - **Personalização de Temas**: 8 opções de cores de tema persistidas no navegador (Vermelho, Azul, Verde, Roxo, Laranja, Teal, Índigo, Rosa).
  - **Marcação de Candidaturas**: Controle local com checkbox "Candidatei-me" salvo no `localStorage`.
- **Monitoramento Multitópico**: Realiza buscas segmentadas por áreas especializadas de TI e buscas amplas gerais.
- **Isolamento de Dados**: Separação física entre o histórico de tech (`vagas_recentes.json`) e vagas gerais (`vagas_gerais.json`).
- **Ordem de Execução Prioritária**: Módulos de tech rodam primeiro, garantindo prioridade no registro do cache (`vagas_vistas.json`) e evitando que vagas técnicas sejam duplicadas na listagem geral.
- **Deduplicação Global**: Armazena o ID original de cada vaga no arquivo de histórico (`vagas_vistas.json`). Se uma vaga contiver múltiplos termos (ex: *"Suporte Júnior"*), ela é notificada no primeiro tópico correspondente e não gera alertas duplicados nos demais.
- **Filtro de Recorrência**: Notifica apenas vagas publicadas nos últimos 4 dias e limpa automaticamente registros do cache com mais de 7 dias.
- **Resiliência e Retentativas**: Sistema de retentativas automáticas (`retry`) com tolerância a falhas na API da Gupy e na API do Telegram.
- **Divisão de Mensagens**: Agrupa as vagas em blocos compatíveis com o limite de 4.096 caracteres do Telegram.
- **Execução Modular**: Cada tópico pode ser executado individualmente ou de forma unificada através do orquestrador principal `main.py`.
- **Zero Dependências Externas**: Utiliza estritamente a biblioteca padrão do Python (`urllib`, `json`, `datetime`, `zoneinfo`) e Vanilla JS/CSS no frontend.
- **CI/CD com GitHub Actions**: Roda na nuvem e comita os históricos atualizados (`vagas_vistas.json`, `vagas_recentes.json`, `vagas_gerais.json`) de volta no repositório.

---

## 📁 Estrutura de Pastas

```text
MinhasVagas/
├── .github/
│   └── workflows/
│       └── main.yml               # Pipeline de monitoramento e commit (GitHub Actions)
├── topics/                        # Módulos individuais de cada tópico
│   ├── __init__.py                # Exporta TODOS_TOPICOS para o orquestrador
│   ├── suporte.py                 # Suporte (Presencial SP/ABC)
│   ├── suporte_remoto.py          # Suporte (Remoto)
│   ├── ti.py                      # TI (Presencial SP/ABC)
│   ├── ti_remoto.py               # TI (Remoto)
│   ├── infra.py                   # Infraestrutura (Presencial SP/ABC)
│   ├── service_desk.py            # Service Desk (Presencial SP/ABC)
│   ├── service_desk_remoto.py     # Service Desk (Remoto)
│   ├── junior.py                  # Júnior (Presencial SP/ABC)
│   ├── junior_remoto.py           # Júnior (Remoto)
│   ├── help_desk.py               # Help Desk (Presencial SP/ABC)
│   ├── help_desk_remoto.py        # Help Desk (Remoto)
│   ├── jr.py                      # JR (Presencial SP/ABC)
│   ├── jr_remoto.py               # JR (Remoto)
│   ├── geral_presencial.py        # Geral Presencial (Grande SP)
│   └── geral_remoto.py            # Geral Remoto
├── common.py                      # Funções centrais (API Gupy, Telegram, Cache, .env)
├── main.py                        # Orquestrador principal que executa todos os tópicos
├── index.html                     # Interface do Dashboard (GitHub Pages)
├── styles.css                     # Estilos visuais e temas
├── app.js                         # Lógica do Dashboard, filtros, temas e gráficos
├── links.txt                      # Referência de URLs e filtros da Gupy
├── vagas_vistas.json              # Cache de controle de IDs já processados
├── vagas_recentes.json            # Histórico dos últimos 7 dias (Vagas Tech)
├── vagas_gerais.json              # Histórico dos últimos 7 dias (Vagas Gerais)
├── .env                           # Credenciais locais (ignorado no Git)
├── .gitignore                     # Configuração de arquivos ignorados pelo Git
└── README.md                      # Documentação do projeto
```

---

## 🧭 Tópicos e IDs Configurados

| Módulo | Arquivo | Termo / Filtro Gupy | Modalidade / Região | ID Telegram |
|---|---|---|---|---|
| **Suporte** | `topics/suporte.py` | `Suporte` | Presencial (SP / ABC) | `7` |
| **Suporte Remoto** | `topics/suporte_remoto.py` | `Suporte` | Remoto | `17` |
| **TI** | `topics/ti.py` | `ti` | Presencial (SP / ABC) | `18` |
| **TI Remoto** | `topics/ti_remoto.py` | `ti` | Remoto | `19` |
| **Infraestrutura** | `topics/infra.py` | `infra` | Presencial (SP / ABC) | `20` |
| **Service Desk** | `topics/service_desk.py` | `Service Desk` | Presencial (SP / ABC) | `21` |
| **Service Desk Remoto** | `topics/service_desk_remoto.py` | `Service Desk` | Remoto | `22` |
| **Júnior** | `topics/junior.py` | `Júnior` | Presencial (SP / ABC) | `23` |
| **Júnior Remoto** | `topics/junior_remoto.py` | `Júnior` | Remoto | `24` |
| **Help Desk** | `topics/help_desk.py` | `HELP DESK` | Presencial (SP / ABC) | `25` |
| **Help Desk Remoto** | `topics/help_desk_remoto.py` | `help desk` | Remoto | `26` |
| **JR** | `topics/jr.py` | `jr` | Presencial (SP / ABC) | `131` |
| **JR Remoto** | `topics/jr_remoto.py` | `jr` | Remoto | `132` |
| **Geral Presencial** | `topics/geral_presencial.py` | Todas as vagas | Presencial (SP / ABC) | *(Pendente // TODO)* |
| **Geral Remoto** | `topics/geral_remoto.py` | Todas as vagas | Remoto | *(Pendente // TODO)* |

---

## ⚙️ Configuração do Ambiente

### 1. Configuração Local (`.env`)

Crie ou edite o arquivo `.env` na raiz do projeto com as credenciais do bot do Telegram:

```env
TELEGRAM_BOT_TOKEN="SEU_TOKEN_AQUI"
TELEGRAM_CHAT_ID="ID_DO_SEU_CHAT_OU_GRUPO"
```

> **Nota**: Os IDs dos tópicos estão definidos diretamente em cada módulo dentro de `topics/`, não sendo necessário criar variáveis de ambiente adicionais para eles.

### 2. Configuração no GitHub Actions (Secrets)

No seu repositório do GitHub, acesse **Settings > Secrets and variables > Actions** e adicione os seguintes segredos:

* `TELEGRAM_BOT_TOKEN`: Token gerado pelo @BotFather.
* `TELEGRAM_CHAT_ID`: ID do chat/supergrupo onde as notificações serão publicadas.

---

## 🚀 Como Executar

### Executar Todos os Tópicos (Recomendado)

Roda o orquestrador que consulta todos os tópicos em sequência e exibe um resumo da execução:

```bash
python main.py
```

### Executar um Tópico Específico

Você pode rodar qualquer módulo da pasta `topics/` de forma independente:

```bash
# Executa apenas vagas de Suporte Presencial
python topics/suporte.py

# Executa apenas vagas de TI Remoto
python topics/ti_remoto.py
```

---

## 🔄 Automação Contínua (CI/CD)

O workflow configurado em `.github/workflows/main.yml` executa a cada 1 hora via cron do GitHub Actions:

1. Faz checkout do código.
2. Configura o ambiente Python 3.11.
3. Executa `python main.py` utilizando os secrets configurados.
4. Salva e comita automaticamente os históricos atualizados (`vagas_vistas.json`, `vagas_recentes.json`, `vagas_gerais.json`) no repositório.

---

## 🛠️ Como Adicionar um Novo Tópico

1. Crie um novo arquivo dentro de `topics/` (ex: `topics/qa.py`):
   ```python
   import os
   import sys

   sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
   from common import executar_monitoramento

   TOPIC_NAME = "QA / Qualidade de Software"
   LIMIT = 50
   TELEGRAM_TOPIC_ID = 27  # ID do tópico no Telegram
   API_URL = "https://employability-portal.gupy.io/api/v1/jobs?jobName=QA&limit=50&offset=0&workplaceType=remote"

   def processar_vagas():
       return executar_monitoramento(
           topic_name=TOPIC_NAME,
           api_url=API_URL,
           topic_id=TELEGRAM_TOPIC_ID
       )

   if __name__ == "__main__":
       processar_vagas()
   ```
