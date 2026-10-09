# AGENTS.md

Projeto em português (código, comentários, commits, UI): mantenha o idioma. O README.md é extenso e correto; consulte-o para detalhes dos filtros, buscas e descrições.

## Comandos
- Rodar o monitor (sempre da raiz; chama a API real da Gupy e **reescreve `data/*.json`**): `python monitor/main.py`
- Testes (sem rede): `python3 -m unittest discover -s . -p 'test_*.py'`; um arquivo: `... -p 'test_filtros.py'`
- Simular o guardião (sem HTTP/git): `python3 monitor/checar_guardiao.py`
- Sem dependências externas (só stdlib Python 3.11, JS/CSS vanilla). Não há lint, formatter, typecheck nem build.
- Frontend: sem build; abra/sirva `index.html` da raiz (ele faz `fetch('data/...')`, então precisa de servidor HTTP, ex. `python3 -m http.server`).

## Estrutura
- Raiz = o que o GitHub Pages serve: `index.html` precisa ficar nela; `assets/app.js` + `assets/styles.css` são o front.
- `monitor/`: `main.py` (orquestrador) → `consultas.py` (lista `BUSCAS`) → `common.py` (API, cache, histórico) → `descricoes.py` (filtros de cargo/escopo e extração de descrições). `guardiao.py` / `checar_guardiao.py` são do workflow de recuperação.
- Os módulos de `monitor/` importam uns aos outros sem pacote (`from descricoes import ...`); os testes fazem `sys.path.insert` para `monitor/`.
- `data/` é commitado pelo CI (bots), não só estado local: não commite `data/` por acaso ao mexer em código, e espere conflitos/atualizações vindas do bot em `master`.

## Armadilhas
- **A ordem de `BUSCAS` importa**: a primeira busca que encontra um ID define o rótulo (`topic`); as outras são ignoradas pela deduplicação. Tech vem antes de gerais, e a busca ampla (`None`) por último.
- Rótulos novos: o dashboard filtra por substring em `topic`; evite colidir com `suporte`, `ti`, `infra`, `service desk`, `júnior`, `help desk`, `jr`, `assistente`, `auxiliar`. Novo botão exige `<button>` em `index.html` + `case` no `switch` de `assets/app.js`.
- `AREAS_FORA_DE_TECH` (`monitor/descricoes.py`): regex multilinha, uma área por linha, **escrita sem acento** (a comparação passa por `_sem_acento()`; acento = alternativa morta sem erro). O filtro de escopo vale só para destino `tech`, nunca `geral`.
- Os filtros de cargo e escopo são deliberadamente conservadores (descartar errado esconde vaga). Descartadas entram em `vagas_vistas.json` mas não no histórico.
- A API da Gupy: `limit` máximo é 100 (acima dá HTTP 400); não aceita exclusão de termos; busca é por radical e ignora acento.
- `descricoes.json` é regravado a cada execução só com IDs presentes nos dois históricos. `monitor/backfill_descricoes.py` (~600 requisições, lento) preenche vagas antigas.
- `app.js`: as listas "Últimos 2 dias"/"Não candidatadas" são snapshots do carregamento (`state.appliedAtLoad`); marcar "Candidatei-me" não remove o card até recarregar. Isso é intencional.

## Testes
- `test_filtros.py::HistoricoReal` lê o `data/` real; 3 testes (`test_a_limpeza_tira_as_sobras_do_tecnico`, `test_gerais_nao_perde_estagio_fora_do_escopo`, `test_o_escopo_muda_a_aba_de_estagio`) falham hoje porque o histórico atual não contém os títulos que eles esperam (dependem do conteúdo de `data/`, não de bug no código). Não "conserte" o filtro por causa deles sem verificar.

## CI
- `main.yml`: cron `30 21 * * *` (UTC = 18h30 BRT) roda `monitor/main.py`, grava o sentinela e commita `data/` em `master`.
- `guardiao.yml`: roda 8x/dia (`17 1-23/3 * * *`); só executa o monitor se `data/ultimo_monitoramento.json` mostrar o disparo do dia sem cobertura. Os dois workflows compartilham `concurrency.group: monitoramento-gupy` (mantenha igual, no nível do job, `cancel-in-progress: false`).
- `HORA_DO_CRON_UTC` em `monitor/guardiao.py` espelha o cron de `main.yml` manualmente: se mudar um, mude o outro (e `checar_guardiao.py`).
- Heartbeat externo via secret `HC_PING_URL`; commits do bot usam `[skip ci]`. Cron só vale a partir do branch padrão (`master`).
