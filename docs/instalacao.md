# Tutorial de InstalaÃ§Ã£o e Uso

Passo a passo completo para rodar o projeto do zero: instalar o uv, clonar o
repositÃ³rio, preparar o ambiente, rodar o monitoramento e abrir o dashboard.

Funciona igual em **Linux**, **Windows** e **macOS**, e o comando Ã© o mesmo nos
trÃªs. Onde hÃ¡ diferenÃ§a, o texto marca o sistema.

---

## SumÃ¡rio

1. [O que Ã© preciso ter](#1-o-que-Ã©-preciso-ter)
2. [Instalar o Python](#2-instalar-o-python)
3. [Clonar o repositÃ³rio](#3-clonar-o-repositÃ³rio)
4. [Preparar o ambiente (uv)](#4-preparar-o-ambiente-uv)
5. [DependÃªncias](#5-dependÃªncias)
6. [Rodar o monitoramento](#6-rodar-o-monitoramento)
7. [Abrir o dashboard](#7-abrir-o-dashboard)
8. [Rodar os testes](#8-rodar-os-testes)
9. [Comandos auxiliares](#9-comandos-auxiliares)
10. [Problemas comuns](#10-problemas-comuns)

---

## 1. O que Ã© preciso ter

| Requisito | VersÃ£o | ObservaÃ§Ã£o |
|---|---|---|
| [uv](https://docs.astral.sh/uv/) | qualquer uma | Gerencia Python, ambiente e dependÃªncias. Ele **baixa o Python sozinho**, entÃ£o nÃ£o Ã© preciso instalar antes. |
| Python | **3.10 ou superior** | O uv instala o 3.11, que Ã© o do CI. Abaixo de 3.10 o projeto nÃ£o roda â€” ver abaixo. |
| Git | qualquer uma | SÃ³ para clonar o repositÃ³rio. |
| ConexÃ£o com a internet | â€” | A API da Gupy Ã© consultada sem autenticaÃ§Ã£o. |
| Navegador moderno | â€” | SÃ³ para o dashboard. Qualquer um dos Ãºltimos 5 anos serve. |

**Nenhuma credencial Ã© necessÃ¡ria.** NÃ£o existe API key, token ou cadastro
prÃ©vio: a API pÃºblica da Gupy Ã© lida diretamente e o resultado Ã© gravado em
arquivos JSON dentro do prÃ³prio repositÃ³rio.

### Por que 3.10 Ã© o mÃ­nimo

O cÃ³digo usa anotaÃ§Ãµes com `X | None` avaliadas em tempo de execuÃ§Ã£o, em
`monitor/consultas.py` (`job_name: str | None`) e `monitor/guardiao.py`
(`-> dict | None`). Essa sintaxe para unificar tipos existe a partir do Python
3.10. Rodar em 3.9 dÃ¡ `TypeError: unsupported operand type(s) for |` jÃ¡ no
import.

---

## 2. Instalar o Python

**Este passo Ã© opcional.** O uv do passo 4 baixa e gerencia o Python por conta
prÃ³pria, inclusive em mÃ¡quina que nÃ£o tem nenhum. Se vocÃª jÃ¡ tem Python 3.10 ou
superior, pule para o passo 4.

SÃ³ siga daqui se preferir instalar antes, ou se quiser usar `python` direto sem o
uv.

### Linux

Verifique se jÃ¡ existe:

```bash
python3 --version
```

Se nÃ£o existir, no Ubuntu/Debian:

```bash
sudo apt update
sudo apt install python3 python3-venv
```

No Fedora: `sudo dnf install python3`

### Windows

Baixe o instalador em <https://www.python.org/downloads/>.

**Marque "Add Python to PATH"** na primeira tela do instalador. Sem isso o
`python` nÃ£o Ã© reconhecido no terminal e o erro Ã© crÃ­ptico.

Confira a versÃ£o abrindo o PowerShell:

```powershell
python --version
```

> Se `python` nÃ£o funcionar mas `py` funcionar, use `py` no lugar de `python` em
> todos os comandos deste documento. O `py` Ã© o launcher do Windows e nÃ£o
> depende do PATH.

### macOS

O macOS jÃ¡ vem com um Python, mas esse Ã© o "System Python" e **nÃ£o deve ser
usado** â€” ele some em atualizaÃ§Ã£o do macOS e nÃ£o aceita `pip install`. Instale
pelo Homebrew:

```bash
brew install python
python3 --version
```

Sem Homebrew? Baixe o instalador em <https://www.python.org/downloads/macos/>.

---

## 3. Clonar o repositÃ³rio

```bash
git clone <url-do-repositorio> MinhasVagas
cd MinhasVagas
```

O restante do tutorial assume que vocÃª estÃ¡ **na raiz do repositÃ³rio** â€” a pasta
que contÃ©m `index.html`, `monitor/`, `assets/` e `data/`.

---

## 4. Preparar o ambiente (uv)

O projeto usa o [**uv**](https://docs.astral.sh/uv/), um gerenciador que resolve
Python, ambiente virtual e dependÃªncias em um binÃ¡rio sÃ³. O motivo prÃ¡tico Ã©
trocar de mÃ¡quina: com ele, `uv sync` produz o mesmo ambiente no Windows, no
Linux e no macOS, e nÃ£o existe a sequÃªncia `criar venv â†’ ativar â†’ pip install`.

### Instalar o uv

| Sistema | Comando |
|---|---|
| Windows | `winget install astral-sh.uv` |
| Linux e macOS | `curl -LsSf https://astral.sh/uv/install.sh \| sh` |

Feche e abra o terminal depois de instalar, para o PATH ser relido.

### Sincronizar

```bash
uv sync
```

Isso faz trÃªs coisas de uma vez:

1. **Baixa o Python 3.11** se a mÃ¡quina nÃ£o o tiver. A versÃ£o vem de
   `.python-version`, e Ã© a mesma do CI (`main.yml`). Ã‰ o ponto do arquivo:
   sem ele, a mÃ¡quina de alguÃ©m pode ter 3.13 e o CI rodar 3.11, e o projeto sÃ³
   falhar em um dos dois lugares.
2. **Cria `.venv/`** com esse Python. NÃ£o precisa ativar nada.
3. **Instala as dependÃªncias** declaradas em `pyproject.toml`.

O `uv.lock` Ã© versionado no repositÃ³rio de propÃ³sito: Ã© ele que garante que todas
as mÃ¡quinas peguem as mesmas versÃµes.

### Precisa do Python instalado antes?

NÃ£o. O uv baixa e gerencia o interpretador por conta prÃ³pria, inclusive em mÃ¡quina
sem Python nenhum. O passo 2 deste tutorial continua valendo para quem prefere
instalar antes.

---

## 5. DependÃªncias

O projeto usa **apenas a biblioteca padrÃ£o do Python** (`urllib`, `json`,
`datetime`, `zoneinfo`, `threading`), com uma exceÃ§Ã£o declarada em
`pyproject.toml`:

```toml
dependencies = [
    "tzdata; sys_platform == 'win32'",
]
```

### Por que o `tzdata` sÃ³ Ã© necessÃ¡rio no Windows

`monitor/common.py` e `monitor/guardiao.py` usam
`ZoneInfo("America/Sao_Paulo")` para converter as datas da Gupy para o horÃ¡rio de
BrasÃ­lia. A biblioteca `zoneinfo` (que faz parte da biblioteca padrÃ£o desde o
Python 3.9) nÃ£o embute o banco de fuso horÃ¡rio: ela lÃª o do sistema
operacional.

- **Linux, macOS e o CI (Ubuntu):** o arquivo existe em `/usr/share/zoneinfo`, e
  `ZoneInfo` encontra. O marcador `sys_platform` faz o uv nÃ£o instalar nada.
- **Windows:** nÃ£o existe um banco de fuso horÃ¡rio do sistema nesse formato. O
  Python sÃ³ acha o dado se o pacote `tzdata` estiver instalado, e o `uv sync` o
  instala sozinho.

Sem ele, o script morre no import, antes de imprimir qualquer coisa:

```text
zoneinfo._common.ZoneInfoNotFoundError: 'No time zone found with key America/Sao_Paulo'
```

### Sem uv?

Nada impede. O projeto funciona com `python` direto, com duas condiÃ§Ãµes: o
interpretador tem que ser 3.10 ou superior, e no Windows o `tzdata` precisa estar
instalado.

```bash
# SÃ³ no Windows, se nÃ£o usar uv
python -m pip install tzdata
python monitor/main.py
```

---

## 6. Rodar o monitoramento

```bash
uv run monitor/main.py
```

O `uv run` nÃ£o precisa do `.venv` ativado: ele cria ou reaproveita o ambiente e
roda o comando dentro dele. Ã‰ o mesmo nos trÃªs sistemas.

Sem uv, seria `python monitor/main.py` (ou `python3`, se o `python` nÃ£o estiver
no PATH).

O programa percorre as 53 consultas â€” cada termo de busca Ã— presencial e remoto,
com uma exceÃ§Ã£o: o botÃ£o **ABC** gera sÃ³ a presencial â€”, com 1 segundo de
intervalo entre elas, e imprime um resumo no final.

### Ver o resultado

```text
============================================================
ðŸš€ INICIANDO MONITORAMENTO DE VAGAS GUPY
============================================================

--- "Suporte" â†’ Suporte (vagas_recentes.json) ---
Nenhuma vaga nova publicada nos Ãºltimos 4 dias para ["Suporte" â†’ Suporte].

...

ðŸ“Š VAGAS TECH â€” novas por Ã¡rea (vagas_recentes.json)
============================================================
  â€¢ Desenvolvimento         0
  â€¢ EstÃ¡gio                0
  â€¢ Suporte                0
  â€¢ TI                     0
------------------------------------------------------------
Total de novas vagas notificadas: 0
============================================================
```

### O que o programa altera

Rodar Ã© seguro e **nÃ£o duplica nada**: o cache `data/vagas_vistas.json` filtra
os IDs jÃ¡ processados. Os arquivos tocados sÃ£o:

| Arquivo | O que acontece |
|---|---|
| `data/vagas_vistas.json` | Cache de IDs jÃ¡ vistos (retido por 7 dias). |
| `data/vagas_recentes.json` | HistÃ³rico da aba **Vagas Tech**. |
| `data/vagas_gerais.json` | HistÃ³rico da aba **Vagas Gerais**. |
| `data/vagas_descartadas.json` | Auditoria: as vagas que os filtros cortaram, com o motivo. |
| `data/descricoes.json` | DescriÃ§Ãµes das vagas novas. |

Se vocÃª rodou sÃ³ para testar e nÃ£o quer tocar no histÃ³rico, faÃ§a um
`git checkout -- data/` depois.

### Quanto tempo demora

Cada consulta Ã© sequencial com 1 s de intervalo (proteÃ§Ã£o contra rate limit da
API), e a leitura das pÃ¡ginas das vagas novas roda em paralelo com 8 workers. Uma
execuÃ§Ã£o completa leva de **1 a 5 minutos**, dependendo de quantas vagas novas
apareceram.

---

## 7. Abrir o dashboard

O dashboard Ã© estÃ¡tico: HTML, CSS e JS puro, sem build. Ele lÃª os JSON de
`data/` por `fetch`, entÃ£o precisa ser servido por HTTP â€” **abrir o `index.html`
dando dois cliques nÃ£o funciona**, porque o navegador bloqueia `fetch` em
arquivos locais (`file://`).

### Servir localmente

Com o Python instalado, na raiz do projeto:

```bash
uv run python -m http.server 8000
```

Depois abra <http://localhost:8000> no navegador. Para parar o servidor, `Ctrl+C`.

### Ou usar a versÃ£o publicada

O dashboard jÃ¡ estÃ¡ no GitHub Pages. Se o repositÃ³rio for pÃºblico, basta abrir a
URL do Pages direto no navegador â€” nÃ£o precisa instalar nada.

---

## 8. Rodar os testes

```bash
uv run python -m unittest discover -s tests -p 'test_*.py'
```

Os testes rodam sem rede e sem tocar em `data/`. Detalhes de cada suÃ­te em
[buscas-e-filtros.md](buscas-e-filtros.md).

Rodar apenas um arquivo:

```bash
uv run python -m unittest discover -s tests -p 'test_filtros.py' -v
uv run python -m unittest discover -s tests -p 'test_descartadas.py' -v
uv run python -m unittest discover -s tests -p 'test_guardiao.py' -v
```

---

## 9. Comandos auxiliares

### Inspecionar as URLs que serÃ£o consultadas, sem chamar a API

```bash
uv run python -c "
import sys; sys.path.insert(0, 'monitor')
from consultas import gerar_consultas
for c in gerar_consultas():
    print(c.rotulo_exibicao, '->', c.url)
"
```

### Preencher descriÃ§Ãµes das vagas que jÃ¡ estÃ£o no histÃ³rico

```bash
uv run monitor/backfill_descricoes.py
```

A descriÃ§Ã£o sÃ³ Ã© lida no instante em que a vaga Ã© nova. Este script refaz as
mesmas buscas e monta a descriÃ§Ã£o das vagas que jÃ¡ estavam salvas. SÃ£o ~600
requisiÃ§Ãµes, entÃ£o leva alguns minutos. Ã‰ seguro rodar quantas vezes quiser: ele
nÃ£o toca nos dois arquivos de histÃ³rico, sÃ³ reescreve o `descricoes.json`.

### Simular a cadÃªncia do guardiÃ£o

```bash
uv run monitor/checar_guardiao.py
```

Roda a mÃ¡quina de estados do guardiÃ£o em memÃ³ria (sem HTTP, sem git, sem
GitHub) e imprime a linha do tempo de 24h. Mais detalhe em
[automacao-ci-cd.md](automacao-ci-cd.md).

### Checar / registrar o disparo do dia manualmente

```bash
uv run monitor/guardiao.py verificar
uv run monitor/guardiao.py escrever --origem manual
```

Isso Ã© o que o CI faz. VocÃª sÃ³ precisa se estiver depurando o
[guardiÃ£o](automacao-ci-cd.md).

---

## 10. Problemas comuns

### `ModuleNotFoundError: No module named 'tzdata'`

Falta a dependÃªncia do Windows. `uv sync` instala (passo 4). Sem uv, Ã©
`python -m pip install tzdata`.

### `ZoneInfoNotFoundError: 'No time zone found with key America/Sao_Paulo'`

O `tzdata` nÃ£o estÃ¡ instalado **no ambiente que estÃ¡ rodando**. Com uv, um
`uv sync` resolve. Sem uv e com `.venv` ativado, o `pip install` tem que ser feito
com ele ativo, senÃ£o o pacote vai para o Python do sistema e o `.venv` continua
sem ele.

Confira qual interpretador estÃ¡ em uso:

```bash
uv run python -c "import sys; print(sys.executable)"
```

### `UnicodeEncodeError: 'charmap' codec can't encode character '\U0001f680'`

SÃ³ no **Windows**, e sÃ³ se apareceu depois da versÃ£o que tem o
`monitor/consola.py`. O console legado usa `cp1252`, que nÃ£o tem emoji, e o
programa imprime `ðŸš€`, `ðŸ“Š`, `âš ï¸` e `âŒ`.

O `consola.py` reconfigura `stdout` e `stderr` para UTF-8 no comeÃ§o de cada
script, entÃ£o isso jÃ¡ vem resolvido quando se usa um dos entrypoints. A mensagem
aparece quando um trecho Ã© executado de um jeito que pula essa configuraÃ§Ã£o â€” por
exemplo, importando `main` e chamando `executar_monitoramento()` direto.

SoluÃ§Ã£o para a sessÃ£o atual:

```powershell
$env:PYTHONUTF8="1"
uv run monitor/main.py
```

### `python nÃ£o Ã© reconhecido como comando`

No Windows, o instalador do Python nÃ£o foi marcado com "Add Python to PATH".
Reinstale marcando a opÃ§Ã£o, ou use o launcher `py`. Com uv isso nÃ£o aparece: o
`uv run` nÃ£o depende de `python` estar no PATH.

### `No module named consultas` / `No module named common`

O programa importa os mÃ³dulos irmÃ£os por nome (`from common import ...`), o que
funciona porque o Python coloca a pasta do script no `sys.path`. Isso significa
que **o comando precisa ser `uv run monitor/main.py`** â€” rodar `main.py` de
dentro de `monitor/` funciona, mas rodar o arquivo por caminho absoluto de outro
jeito, ou colar o conteÃºdo no interpretador, nÃ£o.

Para inspecionar os mÃ³dulos isoladamente, inclua a pasta no `sys.path`:

```bash
uv run python -c "
import sys; sys.path.insert(0, 'monitor')
from consultas import gerar_consultas
print(len(list(gerar_consultas())), 'consultas')
"
```

### O dashboard abre mas nÃ£o carrega nenhuma vaga

Duas causas possÃ­veis:

1. **VocÃª abriu o `index.html` direto** (`file://`). Sirva por HTTP â€” passo 7.
2. **Os JSON nÃ£o existem ou estÃ£o corrompidos.** Confira se `data/` tem os quatro
   arquivos. Se vocÃª rodou o monitoramento e algo quebrou no meio, o mais
   seguro Ã© restaurar do git:

   ```bash
   git checkout -- data/
   ```

### `Failed to fetch` no console do navegador

O `fetch` do `app.js` usa caminho **relativo** (`data/vagas_recentes.json`), entÃ£o
a pÃ¡gina tem que ser servida a partir da raiz do repositÃ³rio. Abrir o
`index.html` por um caminho de arquivo quebra isso.

---

## Ver tambÃ©m

- [Buscas e filtros](buscas-e-filtros.md) â€” o que Ã© capturado e como ajustar
- [DescriÃ§Ãµes das vagas](descricoes.md) â€” como o painel monta as seÃ§Ãµes
- [AutomaÃ§Ã£o CI/CD](automacao-ci-cd.md) â€” como roda sozinho todo dia
- [README](../README.md) â€” visÃ£o geral do projeto