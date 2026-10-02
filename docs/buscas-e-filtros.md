# Buscas e Filtros

O que o programa captura, por que cada corte existe e como ajustar sem quebrar
nada. Para instalar e rodar, veja [instalacao.md](instalacao.md).

---

## SumÃ¡rio

1. [As buscas configuradas](#as-buscas-configuradas)
2. [As duas URLs padrÃ£o](#as-duas-urls-padrÃ£o)
3. [Ordem de execuÃ§Ã£o e deduplicaÃ§Ã£o](#ordem-de-execuÃ§Ã£o-e-deduplicaÃ§Ã£o)
4. [Filtro de recorrÃªncia](#filtro-de-recorrÃªncia)
5. [Filtro de cargo](#filtro-de-cargo)
6. [Filtro de escopo de Ã¡rea](#filtro-de-escopo-de-Ã¡rea)
7. [A aba de descartadas](#a-aba-de-descartadas)
8. [Adicionar ou remover uma busca](#adicionar-ou-remover-uma-busca)
9. [Adicionar ou remover uma Ã¡rea do filtro](#adicionar-ou-remover-uma-Ã¡rea-do-filtro)
10. [Testes](#testes)

---

## As buscas configuradas

Todas as buscas vivem na lista `BUSCAS` de `monitor/consultas.py`. Cada linha
gera **duas** consultas: uma presencial (Grande SP) e uma remota â€” com duas
exceÃ§Ãµes, que sÃ£o o botÃ£o **ABC** e a busca ampla, ambas marcadas com
`apenas_presencial` (ver [o quarto campo da linha](#o-quarto-campo-da-linha)).

**A ordem da lista importa.** A primeira busca que encontra uma vaga define o
rÃ³tulo dela â€” as demais sÃ£o ignoradas pela deduplicaÃ§Ã£o de ID. Por isso a lista
segue a ordem dos botÃµes do dashboard: tech primeiro, gerais depois, e a busca
ampla por Ãºltimo.

### BotÃµes da aba "Vagas Tech" â€” `Todas Â· EstÃ¡gio Â· Suporte Â· Dev Â· TI Â· Outras`

| Termo (`jobName`) | Destino | RÃ³tulo no card | BotÃ£o |
|---|---|---|---|
| `estagio` | `tech` | `EstÃ¡gio` / `EstÃ¡gio Remoto` | EstÃ¡gio |
| `estagiario` | `tech` | `EstÃ¡gio` / `EstÃ¡gio Remoto` | EstÃ¡gio |
| `trainee` | `tech` | `EstÃ¡gio` / `EstÃ¡gio Remoto` | EstÃ¡gio |
| `Suporte` | `tech` | `Suporte` / `Suporte Remoto` | Suporte |
| `tÃ©cnico` | `tech` | `Suporte` / `Suporte Remoto` | Suporte |
| `desenvolvedor` | `tech` | `Desenvolvimento` / `Desenvolvimento Remoto` | Dev |
| `desenvolvimento` | `tech` | `Desenvolvimento` / `Desenvolvimento Remoto` | Dev |
| `dev` | `tech` | `Desenvolvimento` / `Desenvolvimento Remoto` | Dev |
| `developer` | `tech` | `Desenvolvimento` / `Desenvolvimento Remoto` | Dev |
| `software` | `tech` | `Desenvolvimento` / `Desenvolvimento Remoto` | Dev |
| `devops` | `tech` | `Desenvolvimento` / `Desenvolvimento Remoto` | Dev |
| `sistemas` | `tech` | `Sistemas` / `Sistemas Remoto` | Dev |
| `TI` | `tech` | `TI` / `TI Remoto` | TI |
| `tecnologia` | `tech` | `TI` / `TI Remoto` | TI |
| `infra` | `tech` | `Outras` / `Outras Remoto` | Outras |
| `help desk` | `tech` | `Outras` / `Outras Remoto` | Outras |
| `service desk` | `tech` | `Outras` / `Outras Remoto` | Outras |
| `e-commerce` | `tech` | `Outras` / `Outras Remoto` | Outras |
| `ecommerce` | `tech` | `Outras` / `Outras Remoto` | Outras |

O botÃ£o **Todas** nÃ£o tem busca prÃ³pria: ele mostra todas as vagas de
tecnologia do histÃ³rico **menos o estÃ¡gio**, que tem botÃ£o separado. Ã‰ por isso
que o estÃ¡gio Ã© a *primeira* busca da lista â€” o "Todas" Ã© justamente o conjunto
que o "EstÃ¡gio" exclui. Como a busca ampla vem por Ãºltimo e Ã© sÃ³ da aba geral,
ela nÃ£o alcanÃ§a a aba de tecnologia: as vagas de tech jÃ¡ foram rotuladas pelas
buscas especÃ­ficas.

### BotÃµes da aba "Vagas Gerais" â€” `ABC Â· Banco de Talentos Â· Administrativo Â· Almoxarifado Â· JÃºnior Â· Auxiliar Â· Remoto`

| Termo (`jobName`) | Destino | RÃ³tulo no card | BotÃ£o |
|---|---|---|---|
| *(vazio, sÃ³ ABC)* | `geral` | `ABC` | ABC |
| `banco de talentos` | `geral` | `Banco de Talentos` / `Banco de Talentos Remoto` | Banco de Talentos |
| `administrativo` | `geral` | `Administrativo` / `Administrativo Remoto` | Administrativo |
| `almoxarifado` | `geral` | `Almoxarifado` / `Almoxarifado Remoto` | Almoxarifado |
| `jr` | `geral` | `JÃºnior` / `JÃºnior Remoto` | JÃºnior |
| `JÃºnior` | `geral` | `JÃºnior` / `JÃºnior Remoto` | JÃºnior |
| `auxiliar` | `geral` | `Auxiliar Presencial` / `Auxiliar Remoto` | Auxiliar |
| *(vazio)* | `geral` | `Geral Presencial` / `Geral Remoto` | Remoto |

> O termo vazio (`None`) nÃ£o usa `jobName` na URL: Ã© a busca ampla, que captura
> qualquer vaga publicada nas cidades monitoradas, inclusive as que nenhum outro
> termo encontra. Por vir por Ãºltimo, ela sÃ³ rotula as vagas que sobraram â€” as
> vagas de um cargo especÃ­fico jÃ¡ foram rotuladas antes e nÃ£o caem aqui.

Duas particularidades dessa lista:

- **O botÃ£o "Remoto" nÃ£o Ã© uma busca.** Ele filtra por modalidade, entÃ£o alcanÃ§a
  tambÃ©m as vagas remotas que os termos de cargo acima jÃ¡ rotularam â€” por isso
  ele Ã© o Ãºltimo botÃ£o e nÃ£o aparece na tabela. NÃ£o hÃ¡ botÃ£o "Presencial": as
  vagas presenciais sÃ£o as de cada botÃ£o de cargo.
- **O botÃ£o "ABC" Ã© geogrÃ¡fico, nÃ£o um cargo.** Ã‰ a busca ampla restrita ao ABC
  Paulista (`CIDADES_ABC`: Santo AndrÃ©, SÃ£o Bernardo do Campo, Diadema e SÃ£o
  Caetano do Sul, sem SÃ£o Paulo capital), e por isso vem primeiro â€” Ã© o botÃ£o
  padrÃ£o da aba e o lugar onde a pessoa realmente quer trabalhar.

### O quarto campo da linha

Uma linha pode ter um quarto campo, `ajustes`, que Ã© um dicionÃ¡rio. As opÃ§Ãµes
aceitas estÃ£o em `OPCOES_DE_BUSCA`:

| OpÃ§Ã£o | Efeito |
|---|---|
| `apenas_presencial` | Gera **uma** consulta sÃ³, na modalidade presencial. |
| `cidades` | Substitui a lista de cidades da consulta presencial (`CIDADES` â†’ esta). |

```python
(None, "geral", "ABC", {"apenas_presencial": True, "cidades": CIDADES_ABC}),
```

Ã‰ o que resolve o caso do ABC: sem o `apenas_presencial`, o botÃ£o apareceria
tambÃ©m em "Remoto" e contaria as vagas remotas de qualquer empresa â€” que nÃ£o sÃ£o
vagas do ABC. Sem o `cidades`, a busca traria o estado inteiro.

### Termos que a API resolve sozinha

A busca da Gupy Ã© por radical e ignora acentos, o que evita variantes duplicadas:

| Termo usado | Cobre automaticamente | Como foi verificado |
|---|---|---|
| `desenvolvedor` | `desenvolvedora` | conjuntos de IDs idÃªnticos |
| `sistemas` | `sistema` | conjuntos de IDs idÃªnticos |
| `tÃ©cnico` | `tÃ©cnica` | conjuntos de IDs idÃªnticos |

JÃ¡ `estagiario`, `desenvolvimento` e `dev` **nÃ£o** sÃ£o cobertos por `estagio` e
`desenvolvedor` â€” os conjuntos de IDs sÃ£o totalmente disjuntos, entÃ£o cada um
precisa de busca prÃ³pria. O mesmo vale para `trainee` e `developer`, que tambÃ©m
entram como busca separada. Ã‰ por isso que o botÃ£o **EstÃ¡gio** usa `estagio` +
`estagiario` + `trainee`, e o botÃ£o **Dev** usa `desenvolvedor` +
`desenvolvimento` + `dev` + `developer` + `software` + `devops`.

---

## As duas URLs padrÃ£o

```text
Presencial: https://portal.gupy.io/api/job-search/jobs?limit=100&offset=0&city=<CIDADES>&state=SÃ£o Paulo
Remoto:     https://portal.gupy.io/api/job-search/jobs?limit=100&offset=0&workplaceType=remote
```

O `CIDADES` Ã© a Grande SP (SÃ£o Paulo, SÃ£o Bernardo do Campo, Diadema, Santo
AndrÃ© e SÃ£o Caetano do Sul) e o botÃ£o **ABC** troca a lista por `CIDADES_ABC`, que
Ã© a mesma sem SÃ£o Paulo capital.

O `jobName` Ã© acrescentado a uma delas conforme o termo. O `limit=100` Ã© o teto
aceito pela API (acima disso retorna HTTP 400) e, como os resultados vÃªm
ordenados por data de publicaÃ§Ã£o, `offset=0` jÃ¡ traz as vagas mais recentes.

---

## Ordem de execuÃ§Ã£o e deduplicaÃ§Ã£o

Os termos de tech rodam primeiro, o que dÃ¡ prioridade no registro do cache
(`vagas_vistas.json`) e evita que vagas tÃ©cnicas sejam duplicadas na listagem
geral.

O cache armazena o ID original de cada vaga. Se a mesma vaga for encontrada por
termos diferentes, ela sÃ³ Ã© registrada na primeira consulta que a encontrar. Ã‰ o
que faz rodar duas vezes seguidas nÃ£o duplicar nada.

---

## Filtro de recorrÃªncia

Apenas vagas publicadas nos **Ãºltimos 4 dias** entram no histÃ³rico
(`MAX_DIAS_PUBLICACAO_DEFAULT`), e o cache Ã© limpo de registros com mais de **7
dias** (`DIAS_RETENCAO_CACHE_DEFAULT`). Ambos ficam em `monitor/common.py`.

Os dois nÃºmeros sÃ£o diferentes de propÃ³sito: 4 dias Ã© a janela do que Ã©
"novidade", 7 dias Ã© o quanto o dashboard guarda para consulta.

---

## Filtro de cargo

Vagas de nÃ­vel avanÃ§ado sÃ£o descartadas antes de entrar no histÃ³rico: **sÃªnior/sr**,
**pleno/pl**, **especialista**, **gerente**, **diretor**, **coordenador**,
**supervisor** e **lÃ­der**. O corte Ã© pelo **tÃ­tulo** da vaga, em
`cargo_para_descartar()` (`monitor/descricoes.py`) â€” a API da Gupy nÃ£o aceita
exclusÃ£o (`excludeTerms` Ã© ignorado, e `jobName=dev -senior` devolve outro
conjunto).

O tÃ­tulo da vaga mistura **cargo** e **Ã¡rea**, e errar para o lado de descartar
apaga oportunidade sem a pessoa nunca ver. Por isso o filtro tem trÃªs partes:

- o **cargo** (`Coordenador de Compras`, `Supervisor`, incluindo feminino e
  plural);
- a **Ã¡rea** (`CoordenaÃ§Ã£o`, `SupervisÃ£o`, `GerÃªncia`);
- o **PL** (que sÃ³ conta quando nÃ£o Ã© `PL/SQL`, dialeto de banco).

Tudo com acento ignorado e palavra inteira, senÃ£o "Sr" casaria dentro de outras
palavras.

Duas regras evitam falso positivo:

- quem aceita os dois nÃ­veis Ã© mantido (`Fullstack AI Engineer - (JR/PL)`,
  `Advogado(a) JÃºnior/Pleno`);
- **cargo de entrada no comeÃ§o do tÃ­tulo** tambÃ©m
  (`Assistente de CoordenaÃ§Ã£o PedagÃ³gica` Ã© vaga de assistente, nÃ£o de
  coordenador).

Esse cargo de entrada Ã© reconhecido com ou sem o prefixo `Pessoa` que boa parte
das vagas da Gupy usa (`Pessoa Assistente de CoordenaÃ§Ã£o`), e o termo de estÃ¡gio
vale para os dois gÃªneros (`EstagiÃ¡ria` tanto quanto `EstagiÃ¡rio`).

A vaga descartada entra no `vagas_vistas.json` para nÃ£o ser re-avaliada a cada
rodada, mas nÃ£o vai para o histÃ³rico nem para o dashboard. O terminal avisa o
motivo: `Descartadas N vaga(s) por cargo avanÃ§ado`.

O corte tambÃ©m roda na limpeza do histÃ³rico, entÃ£o as vagas de cargo avanÃ§ado que
jÃ¡ estavam gravadas saem na prÃ³xima execuÃ§Ã£o.

---

## Filtro de escopo de Ã¡rea

As buscas `estagio` e `estagiario` sÃ£o por radical e nÃ£o aceitam filtro de
Ã¡rea, entÃ£o elas traziam **todo** estÃ¡gio publicado nas cidades monitoradas â€” RH,
jurÃ­dico, marketing, pedagogia, engenharia civil, suprimentos â€” para a aba
**Vagas Tech**. Das 62 vagas de estÃ¡gio do histÃ³rico, sÃ³ 11 eram de tecnologia.

O corte Ã© em `estagio_fora_do_escopo()` (`monitor/descricoes.py`), pelas mesmas
trÃªs regras do filtro de cargo:

1. **SÃ³ vaga de estÃ¡gio entra na conta.** `Analista de Suporte` Ã© suporte de
   verdade, e o rÃ³tulo jÃ¡ a coloca na aba certa.
2. **Tecnologia no tÃ­tulo vence sempre.** `EstÃ¡gio em Suprimentos com SAP` Ã©
   vaga de SAP, nÃ£o de compras. Ã‰ a vÃ¡lvula de escape, e Ã© ela que segura o
   erro mais caro do filtro: apagar uma vaga de tecnologia.
3. **O resto sai se citar uma Ã¡rea que nÃ£o Ã© de tecnologia.** A lista
   (`AREAS_FORA_DE_TECH`) Ã© explÃ­cita em vez de "tudo que nÃ£o for tech", por
   isso qualquer Ã¡rea que ninguÃ©m tenha catalogado passa e a vaga aparece.
   TÃ­tulos sem Ã¡rea (`EstagiÃ¡rio`, `EstÃ¡gio UniversitÃ¡rio`) tambÃ©m passam: o
   tÃ­tulo nÃ£o diz, e o filtro nÃ£o adivinha. **Administrativo nÃ£o estÃ¡ na lista**
   â€” vaga de administrativo Ã© procurada.

Vale **sÃ³ na aba Vagas Tech**. Em **Vagas Gerais**, estÃ¡gio de RH ou de compras Ã©
justamente o que a aba procura â€” o destino vem explÃ­cito do `main.py` atÃ© o
filtro.

A vaga descartada entra no cache e some do histÃ³rico, como no filtro de cargo. O
terminal avisa: `Descartadas N vaga(s) por estÃ¡gio fora da Ã¡rea de tech`.

---

## A aba de descartadas

Os dois filtros somem com a vaga, e Ã© justo isso que incomoda quando se desconfia
do corte: nÃ£o hÃ¡ como saber *o que* foi embora nem *por quÃª*. A aba
**Descartadas** â€” o botÃ£o de lixeira no fim da linha de abas â€” Ã© a resposta.

Ela lÃª `data/vagas_descartadas.json`, gravado por `salvar_descartadas()`
(`monitor/common.py`) a cada rodada, com o que a pessoa precisa para auditar o
corte: `id`, `name`, `careerPageName`, `topic`, **`motivo`**, `publishedDate`,
`data_formatada_br`, `jobUrl` e `workplaceType`.

TrÃªs decisÃµes do arquivo:

- **A descriÃ§Ã£o nÃ£o vai junto.** Puxar o `description` das centenas de vagas
  descartadas seria uma requisiÃ§Ã£o por vaga para um texto que ninguÃ©m lÃª nessa
  aba. O card de descarte por isso nÃ£o tem o botÃ£o "Ver descriÃ§Ã£o".
- **A retenÃ§Ã£o Ã© a mesma do histÃ³rico (7 dias).** Passados 7 dias a vaga jÃ¡ saiu
  do dashboard, entÃ£o guardÃ¡-la aqui sÃ³ acumularia lixo. A poda roda sempre, mesmo
  numa rodada sem vaga nova.
- **O arquivo Ã© deduplicado por ID a cada gravaÃ§Ã£o.** A mesma vaga pode ser
  descartada por termos diferentes â€” o `jobName` Ã© por radical, e "analista de
  suporte sÃªnior" casa em mais de uma busca.

Os filtros da aba sÃ£o os mesmos de "Vagas Tech" **sem o "Todas"**: sem ele, a
aba seria vazia por definiÃ§Ã£o. Nenhum botÃ£o comeÃ§a ativo, e clicar no mesmo botÃ£o
de novo limpa o filtro â€” o estado sem filtro Ã© o que mostra tudo.

---

## Adicionar ou remover uma busca

Basta editar a lista `BUSCAS` em `monitor/consultas.py`. **Nenhum arquivo novo Ã©
preciso.**

```python
BUSCAS = [
    # tech, na ordem dos botÃµes: Todas > EstÃ¡gio > Suporte > Dev > TI > Outras
    ("estagio", "tech", "EstÃ¡gio"),
    ("trainee",  "tech", "EstÃ¡gio"),
    ("Suporte",  "tech", "Suporte"),
    ("tÃ©cnico",  "tech", "Suporte"),
    # ...
    # gerais, na ordem dos botÃµes: ABC > Banco de Talentos > Administrativo >
    # Almoxarifado > JÃºnior > Auxiliar > Remoto
    (None, "geral", "ABC", {"apenas_presencial": True, "cidades": CIDADES_ABC}),
    ("banco de talentos", "geral", "Banco de Talentos"),
    (None, "geral", "Geral Presencial"),
]
```

Cada linha Ã© `(jobName, destino, rÃ³tulo presencial, ajustes)`:

- **`jobName`** â€” termo enviado como `?jobName=`. Use `None` para a busca ampla,
  sem filtro de nome.
- **`destino`** â€” `"tech"` grava em `data/vagas_recentes.json` (aba **Vagas
  Tech**); `"geral"` grava em `data/vagas_gerais.json` (aba **Vagas Gerais**).
- **`rÃ³tulo`** â€” texto exibido no card e usado pelos filtros do dashboard. A
  variante remota Ã© derivada automaticamente: `"Suporte"` â†’ `"Suporte Remoto"`,
  `"Banco de Talentos"` â†’ `"Banco de Talentos Remoto"`.
- **`ajustes`** â€” opcional. `apenas_presencial` e `cidades`, como na tabela de
  [o quarto campo da linha](#o-quarto-campo-da-linha).

VÃ¡rios termos podem compartilhar o mesmo rÃ³tulo: Ã© assim que `infra`, `help desk`,
`service desk`, `e-commerce` e `ecommerce` aparecem juntos no botÃ£o **Outras**, e
como `jr` e `JÃºnior` se fundem no botÃ£o **JÃºnior**. O par `e-commerce`/`ecommerce`
existe porque a API trata as duas grafias como buscas distintas â€” a variante sem
hÃ­fen pega as vagas cujo nome traz sÃ³ `ECOMMERCE`. Para criar um botÃ£o novo no
dashboard, alÃ©m da linha em `BUSCAS` Ã© preciso adicionar o `<button>` em
`index.html` e o `case` correspondente no `switch` de `assets/app.js`.

> **Ressalva sobre o termo `estagiario`:** Ã© o que mais traz vaga fora da aba,
> porque a busca Ã© por radical e a API nÃ£o filtra por Ã¡rea. Ã‰ o `estagiario` que
> faz o dashboard receber estÃ¡gio de RH e de jurÃ­dico, e Ã© o filtro de escopo que
> corta.

> **Importante:** o dashboard filtra as vagas pelo campo `topic`, que recebe esse
> rÃ³tulo. Ao criar um termo novo, escolha um rÃ³tulo que nÃ£o colida com os
> filtros de cargo jÃ¡ existentes (`suporte`, `ti`, `infra`, `service desk`,
> `jÃºnior`, `help desk`, `jr`, `auxiliar`, `abc`, `banco de talentos`,
> `administrativo`, `almoxarifado`) â€” o filtro de "Vagas Tech" faz busca por
> substring e poderia capturar o termo novo por acidente. O botÃ£o **ABC** Ã© a
> exceÃ§Ã£o proposital: ele compara o rÃ³tulo inteiro, porque "ABC" Ã© geografia e
> nÃ£o nome de cargo â€” nenhum outro rÃ³tulo deveria casar com ele.

---

## Adicionar ou remover uma Ã¡rea do filtro

Ãreas nÃ£o se ajustam na lista `BUSCAS`, e sim em `AREAS_FORA_DE_TECH`, no
`monitor/descricoes.py`. Ã‰ uma string multilinha, **uma linha por Ã¡rea**, com os
termos que a nomeiam separados por `|`:

```python
AREAS_FORA_DE_TECH = r"""
    recursos?\s+humanos?|gente\s+e\s+gestao|departamento\s+pessoal
  | remuneracao|folha\s+de\spagamento|recrutament\w*|selecao
  | juridic\w*|advogad\w*|contencioso|arbitragem|tributari\w*|regulatori\w*
  | pedagog\w*|ensino\s+medio|ensino\s+fundamental|licenciatura|geografia
  ...
"""
```

TrÃªs coisas para saber antes de editar:

**O texto vai sem acento.** A comparaÃ§Ã£o passa por `_sem_acento()`, que
normaliza para minÃºsculas e remove os acentos. Escreva `juridic\w*` e nÃ£o
`jurÃ­dic*`; um acento no meio faz a alternativa nunca casar e o termo fica morto
na lista, sem erro nenhum.

**A palavra `\w*` no fim Ã© o que pega a variaÃ§Ã£o.** `juridic\w*` cobre
`jurÃ­dico`, `jurÃ­dica`, `jurÃ­dicos` e `jurÃ­dicas` de uma vez. Sem ele, teria de
escrever cada gÃªnero. Use `\s+` entre palavras de nomes compostos
(`ensino\s+medio`) e `\b` sÃ³ quando a palavra puder grudar na seguinte
(`\bpcp\b`, `\bobras?\b`).

**Para _remover_ uma Ã¡rea, Ã© sÃ³ apagar a linha.** NÃ£o existe lista negativa. E Ã©
por isso que administrativo nÃ£o aparece ali: vaga de administrativo Ã© procurada,
e basta tirÃ¡-lo da lista para ele voltar. Vale notar que a palavra "administraÃ§Ã£o"
continua aparecendo em vÃ¡rios tÃ­tulos dentro de parÃªnteses (`EstÃ¡gio em
SUPRIMENTOS (ADMINISTRAÃ‡ÃƒO, LOGÃSTICA)`) â€” essas seguem descartadas, mas pelo
termo da Ã¡rea de verdade, que vem antes do parÃªntese.

Depois de mexer, confira o efeito antes de deixar valer:

```bash
python -c "
import sys; sys.path.insert(0, 'monitor')
from descricoes import estagio_fora_do_escopo as f
for t in ['EstÃ¡gio em JurÃ­dico', 'EstÃ¡gio em TI', 'EstagiÃ¡rio']:
    print(f(t), t)
"
```

Para ver o efeito em massa, o histÃ³rico atual Ã© a melhor amostra â€” sÃ£o as vagas
reais que a aba vai mostrar:

```bash
python -c "
import json, sys; sys.path.insert(0, 'monitor')
from descricoes import estagio_fora_do_escopo as f
v = [x for x in json.load(open('data/vagas_recentes.json')) if x['topic'].startswith('EstÃ¡gio')]
for x in sorted(v, key=lambda x: x['publishedDate'], reverse=True):
    print(('  MANTE' if not f(x['name']) else '  some '), x['name'][:70])
"
```

O filtro sÃ³ age no que entra a partir da prÃ³xima execuÃ§Ã£o do `main.py`; o
histÃ³rico jÃ¡ gravado Ã© limpo por ela (Ã© o mesmo caminho que apaga cargo
avanÃ§ado).

---

## Testes

```bash
uv run python -m unittest discover -s tests -p 'test_filtros.py'
uv run python -m unittest discover -s tests -p 'test_descartadas.py'
```

`test_filtros.py` tem duas suÃ­tes:

- **`Filtros`** â€” casos sintÃ©ticos que fixam o comportamento dos dois filtros de
  cargo e escopo, incluindo os falsos positivos que nÃ£o podem acontecer
  (`Assistente de CoordenaÃ§Ã£o PedagÃ³gica`, `Fullstack AI Engineer - (JR/PL)`,
  `Pessoa Assistente de CoordenaÃ§Ã£o`).
- **`HistoricoReal`** â€” roda os mesmos filtros contra os arquivos que o
  dashboard serve hoje, e confirma que a limpeza do histÃ³rico apaga as sobras.

`test_descartadas.py` cobre sÃ³ o arquivo de auditoria, e usa pasta temporÃ¡ria em
vez de `data/`. Ele fixa o que Ã© fÃ¡cil quebrar sem perceber: que a descriÃ§Ã£o nÃ£o
Ã© gravada, que a segunda rodada nÃ£o duplica a vaga, que a poda de 7 dias acontece
mesmo numa rodada sem descarte, e a ordem da mais recente para a mais antiga.

> **A suÃ­te `HistoricoReal` depende do estado do `data/`.** Ela olha os arquivos
> de verdade, entÃ£o o que o CI gravou importa: se o histÃ³rico jÃ¡ estiver limpo
> das sobras do filtro, `test_a_limpeza_tira_as_sobras_do_tecnico` falha com
> "nada para limpar" â€” Ã© um aviso de que o teste virou vazio, nÃ£o erro de filtro.
> Do mesmo jeito, a conferÃªncia de que a vaga de tech *fica* sÃ³ se aplica Ã s
> vagas dentro da janela de 7 dias, porque a limpeza tambÃ©m apaga por data.
> Suspeita de filtro: rode o `main.py` e veja o terminal, que ele diz o motivo de
> cada descarte.