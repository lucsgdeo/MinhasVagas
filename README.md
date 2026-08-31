# 🤖 MinhasVagas - Automatizador de Vagas Gupy com Alertas no Telegram

Sistema automatizado em Python para monitoramento periódico de vagas na plataforma **Gupy**, com filtragem inteligente por data, deduplicação global de vagas e envio automático de alertas para tópicos dedicados em um supergrupo do **Telegram**.

---

## 📌 Funcionalidades

- **Monitoramento Multitópico**: Realiza buscas segmentadas por áreas (Suporte, TI, Infraestrutura, Service Desk, Júnior, Help Desk) tanto presenciais (São Paulo/ABC) quanto 100% remotas.
- **Deduplicação Global**: Armazena o ID original de cada vaga no arquivo de histórico (`vagas_vistas.json`). Se uma vaga contiver múltiplos termos (ex: *"Suporte Júnior"*), ela é notificada no primeiro tópico correspondente e não gera alertas duplicados nos demais.
- **Filtro de Recorrência**: Notifica apenas vagas publicadas nos últimos 4 dias e limpa automaticamente registros do cache com mais de 7 dias.
- **Resiliência e Retentativas**: Sistema de retentativas automáticas (`retry`) com tolerância a falhas na API da Gupy e na API do Telegram.
- **Divisão de Mensagens**: Agrupa as vagas em blocos compatíveis com o limite de 4.096 caracteres do Telegram.
- **Execução Modular**: Cada tópico pode ser executado individualmente ou de forma unificada através do orquestrador principal `main.py`.
- **Zero Dependências Externas**: Utiliza estritamente a biblioteca padrão do Python (`urllib`, `json`, `datetime`, `zoneinfo`).
- **CI/CD com GitHub Actions**: Roda automaticamente a cada hora na nuvem e comita o histórico de vagas vistas de volta no repositório.

---

## 📁 Estrutura de Pastas

```text
MinhasVagas/
├── .github/
│   └── workflows/
│       ├── main.yml               # Pipeline de monitoramento periódico (GitHub Actions)
│       └── monitor.yml            # Pipeline alternativo para execuções manuais/agendadas
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
│   └── help_desk_remoto.py        # Help Desk (Remoto)
├── common.py                      # Funções centrais (API Gupy, Telegram, Cache, .env)
├── main.py                        # Arquivo principal que executa todos os tópicos
├── links.txt                      # Referência de URLs e filtros da Gupy
├── vagas_vistas.json              # Cache de vagas já notificadas (JSON)
├── .env                           # Credenciais locais (ignorado no Git)
├── .gitignore                     # Configuração de arquivos ignorados pelo Git
└── README.md                      # Documentação do projeto
```

---

## 🧭 Tópicos e IDs Configurados

| Módulo | Arquivo | Termo Gupy | Modalidade / Região | ID do Tópico Telegram |
|---|---|---|---|---|
| **Suporte** | `topics/suporte.py` | `Suporte` | Presencial (SP / ABC) | `7` |
| **Suporte Remoto** | `topics/suporte_remoto.py` | `Suporte` | 100% Remoto | `17` |
| **TI** | `topics/ti.py` | `ti` | Presencial (SP / ABC) | `18` |
| **TI Remoto** | `topics/ti_remoto.py` | `ti` | 100% Remoto | `19` |
| **Infraestrutura** | `topics/infra.py` | `infra` | Presencial (SP / ABC) | `20` |
| **Service Desk** | `topics/service_desk.py` | `Service Desk` | Presencial (SP / ABC) | `21` |
| **Service Desk Remoto** | `topics/service_desk_remoto.py` | `Service Desk` | 100% Remoto | `22` |
| **Júnior** | `topics/junior.py` | `Júnior` | Presencial (SP / ABC) | `23` |
| **Júnior Remoto** | `topics/junior_remoto.py` | `Júnior` | 100% Remoto | `24` |
| **Help Desk** | `topics/help_desk.py` | `HELP DESK` | Presencial (SP / ABC) | `25` |
| **Help Desk Remoto** | `topics/help_desk_remoto.py` | `help desk` | 100% Remoto | `26` |

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
4. Salva e comita automaticamente o histórico atualizado em `vagas_vistas.json` no repositório.

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

2. Registre o novo módulo em [topics/\_\_init\_\_.py](file:///home/lucas/Documents/Tests/topics/__init__.py).
