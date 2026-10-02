# AutomaÃ§Ã£o CI/CD

Como o monitoramento roda sozinho todo dia no GitHub Actions, como o guardiÃ£o
recupera as execuÃ§Ãµes que o GitHub descarta, e como depurar isso na mÃ£o.

Para instalar e rodar localmente, veja [instalacao.md](instalacao.md).

---

## SumÃ¡rio

1. [O workflow principal](#o-workflow-principal)
2. [Os trÃªs detalhes do agendamento](#os-trÃªs-detalhes-do-agendamento)
3. [O guardiÃ£o](#o-guardiÃ£o)
4. [O heartbeat externo](#o-heartbeat-externo)
5. [Depurando na mÃ£o](#depurando-na-mÃ£o)
6. [Segredos](#segredos)

---

## O workflow principal

O arquivo `.github/workflows/main.yml` roda **todo dia Ã s 18h30** (horÃ¡rio de
BrasÃ­lia) e tambÃ©m pode ser disparado manualmente pela aba **Actions**.

Passos:

1. Faz checkout do cÃ³digo.
2. Configura o ambiente Python 3.11.
3. Executa `python monitor/main.py`.
4. Registra o disparo como coberto
   (`python3 monitor/guardiao.py escrever --origem cron --grace 0`; no CI Ã©
   `python3` porque lÃ¡ nÃ£o hÃ¡ uv).
5. Salva e comita automaticamente os arquivos atualizados de `data/`
   (`vagas_vistas.json`, `vagas_recentes.json`, `vagas_gerais.json`,
   `descricoes.json`) no repositÃ³rio.
6. Envia o sinal de vivÃªncia para o observador externo.

O **GitHub Pages** serve a raiz do repositÃ³rio, entÃ£o o `index.html` publicado Ã©
exatamente o mesmo arquivo que estÃ¡ no branch padrÃ£o, e o `assets/app.js` busca os
JSON de `data/` com caminho relativo.

---

## Os trÃªs detalhes do agendamento

- **O cron Ã© em UTC.** No arquivo estÃ¡ `30 21 * * *`, porque o Brasil Ã© UTCâˆ’3. O
  Brasil nÃ£o tem horÃ¡rio de verÃ£o desde 2019, entÃ£o o deslocamento Ã© fixo o ano
  todo.
- **SÃ³ roda a partir do branch padrÃ£o.** O GitHub lÃª o agendamento do workflow no
  `master`, entÃ£o a mudanÃ§a sÃ³ entra em vigor depois do merge para lÃ¡.
- **18h30 Ã© mais ou menos.** O GitHub agenda jobs com uma pequena fila; em
  horÃ¡rio de pico o inÃ­cio pode atrasar alguns minutos.

---

## O guardiÃ£o

### O problema que ele resolve

O GitHub Actions **descarta execuÃ§Ãµes agendadas sem deixar rastro nenhum**.
Medindo 175 execuÃ§Ãµes contra ~705 eventos agendados em 29 dias de cron horÃ¡rio,
75% dos disparos nunca viraram run. NÃ£o falharam, simplesmente sumiram â€” e o
mÃ¡ximo de atraso observÃ¡vel ficou truncado em 1h justamente porque os que
atrasaram mais nÃ£o tÃªm como ser distinguidos dos que nÃ£o existiram.

Um workflow agendado nÃ£o serviria para detectar isso: ele usaria o mesmo
agendador que falhou, e as duas falhas seriam correlacionadas. Por isso a
checagem se divide em duas peÃ§as independentes:

- `monitor/guardiao.py` + `.github/workflows/guardiao.yml` tentam **recuperar** a
  execuÃ§Ã£o perdida;
- o aviso de que algo quebrou vem de fora do GitHub (ping de heartbeat), e Ã©
  configurado em `main.yml`.

O guardiÃ£o sozinho nÃ£o avisa ninguÃ©m. Ele sÃ³ evita que um dia inteiro de vagas se
perca em silÃªncio â€” se o GitHub e o guardiÃ£o caÃ­rem juntos, o dia some de
qualquer forma, e quem avisa Ã© o heartbeat externo.

### Como funciona

`.github/workflows/guardiao.yml` roda a cada 3 horas, no minuto 17. Duas escolhas
nÃ£o Ã³bvias:

**A hora 1, nÃ£o a hora 0.** A janela das 22:17Z precisa cair **depois** do cron
das 21:30, porque Ã© ela quem recupera um cron descartado. Com janelas em
0,3,6...21 a Ãºltima seria 21:17, antes do cron, e um descarte Ã s 21:30 passaria a
noite inteira sem ninguÃ©m. Foi o que a simulaÃ§Ã£o em `monitor/checar_guardiao.py`
mostrou antes dessa correÃ§Ã£o.

**O objetivo nÃ£o Ã© monitorar 8x por dia.** Isso seria desperdÃ­cio e, pior,
brigaria com o cron oficial. Ã‰ estar presente o suficiente para que uma execuÃ§Ã£o
perdida seja notada em no mÃ¡ximo 47 min. Rodar mais seguido nÃ£o daria mais
garantia: os eventos do GitHub somem de forma correlacionada, entÃ£o 8 janelas
caem juntas num incidente, do mesmo jeito que 1 cairia. A margem real vem do
heartbeat externo, que mora fora do GitHub.

### A mÃ¡quina de estados

`monitor/guardiao.py` responde a uma pergunta sÃ³: *"o disparo de hoje jÃ¡ foi
coberto?"*. A resposta vem de `data/ultimo_monitoramento.json`, uma sentinela com
a data (em UTC) do Ãºltimo disparo coberto.

```
uv run monitor/guardiao.py verificar        # diz se o disparo venceu e ainda nÃ£o foi coberto
uv run monitor/guardiao.py escrever --origem guardiao --se-vencido
```

(No CI os comandos aparecem como `python3`, porque lÃ¡ nÃ£o hÃ¡ uv â€” o runner do
GitHub jÃ¡ vem com o Python instalado.)

O `verificar` publica outputs (`alvo`, `ultima`, `atrasado`) que o `if:` do
workflow lÃª. Ele **sai com 0 mesmo quando atrasado**: quem decide o que fazer Ã© o
`if:` do workflow, e um exit 1 aqui coloriria a run de vermelho mesmo em
operaÃ§Ã£o normal â€” o guardiÃ£o passaria a gerar ruÃ­do justamente no dia em que o
GitHub jÃ¡ estÃ¡ se comportando mal.

O `--se-vencido` no `escrever` Ã© o passo que impede a corrida com o cron: sem a
flag, o guardiÃ£o sobrescreveria a sentinel mesmo quando o cron jÃ¡ tinha
coberto o dia, apagando a prova de qual dos dois realmente cobriu.

### ConcorrÃªncia mÃºtua

Os dois workflows declaram o **mesmo** grupo de concorrÃªncia
(`monitoramento-gupy`), no mesmo nÃ­vel (job) dos dois arquivos. Assim eles ficam
mutuamente excluÃ­dos e nunca disputam o push para a master â€” sem isso, os dois
competiriam pelo commit e um perderia o trabalho depois de todo o monitoramento.

`cancel-in-progress: false` Ã© o que salva o guardiÃ£o. Com `true`, uma janela nova
cancelaria a recuperaÃ§Ã£o em andamento â€” e a janela de 22:17Z Ã© justamente a que
costuma chegar enquanto o cron das 21:30 se recupera.

### Simular o dia inteiro

```bash
python monitor/checar_guardiao.py
```

Roda a mÃ¡quina de estados em memÃ³ria, sem HTTP, sem git e sem GitHub, e imprime
a linha do tempo. Serve para conferir de relance as trÃªs coisas que os testes
unitÃ¡rios nÃ£o mostram juntas:

1. a cadÃªncia real â€” o guardiÃ£o roda 8x por dia, mas monitora 1x;
2. quanto tempo um cron descartado fica sem recuperaÃ§Ã£o;
3. se o ping chega uma vez por dia, e em que hora.

```
  cadence do guardiÃ£o : 8x/dia (minuto 17 de cada 3h)
  monitoramento/dia   : 1 (idempotente, qualquer um dos 9 pode fazer)
  ping/dia            : 1, por volta de 21:31Z (18:31 em BrasÃ­lia)
  pior caso sem cobertura: 3h
  pior caso sem aviso    : o dia inteiro, se GitHub E guardiÃ£o caÃ­rem juntos
```

---

## O heartbeat externo

O ping no fim do `main.yml` Ã© a **Ãºnica** forma de descobrir que o cron nÃ£o
rodou. Tudo dentro do GitHub depende do mesmo agendador que falhou, entÃ£o quem
avisa precisa estar fora.

```yaml
- name: Sinalizar vivÃªncia ao observador externo
  if: success()
  continue-on-error: true
  run: |
    if [ -z "${{ secrets.HC_PING_URL }}" ]; then
      echo "::warning::HC_PING_URL nÃ£o configurado; sem heartbeat externo."
      exit 0
    fi
    if curl -fsS --max-time 10 "${{ secrets.HC_PING_URL }}" >/dev/null; then
      echo "Heartbeat enviado."
    else
      echo "::warning::HC_PING_NAO chegou ao observador externo."
    fi
```

`continue-on-error: true` Ã© deliberado. Os dados jÃ¡ estÃ£o commitados neste ponto;
marcar a run como falha porque o observador estava fora do ar seria mentir sobre o
estado do monitoramento. O aviso de que o ping falhou Ã© o que interessa, e ele sai
no log.

A URL vive em **secret**, e nÃ£o no arquivo, porque o repositÃ³rio Ã© pÃºblico: com o
UUID no `main.yml` qualquer pessoa poderia "pingar" para dentro e mascarar uma
falha real.

---

## Depurando na mÃ£o

Os testes da conta de datas:

```bash
uv run python -m unittest discover -s tests -p 'test_guardiao.py' -v
```

Para checar o estado atual da sentinela:

```bash
python monitor/guardiao.py verificar
cat data/ultimo_monitoramento.json
```

Para registrar um disparo manualmente (Ãºtil depois de uma execuÃ§Ã£o local que
cobre o dia):

```bash
python monitor/guardiao.py escrever --origem manual
```

> Use `--grace 0` se quiser que o registro aponte para o dia de **hoje** em vez do
> dia anterior. O cron usa `--grace 0` porque sabe qual dia Ã©; o guardiÃ£o usa a
> margem de 45 min para nÃ£o se atropelar.

---

## Segredos

| Segredo | Para que serve |
|---|---|
| `HC_PING_URL` | URL do observador externo de heartbeat. Opcional â€” sem ela, o `main.yml` sÃ³ avisa no log. |

O commit dos dados usa a identidade padrÃ£o do bot:

```bash
git config --global user.name "github-actions[bot]"
git config --global user.email "github-actions-bot@users.noreply.github.com"
```

---

## Ver tambÃ©m

- [InstalaÃ§Ã£o e uso](instalacao.md)
- [Buscas e filtros](buscas-e-filtros.md)
- [DescriÃ§Ãµes das vagas](descricoes.md)