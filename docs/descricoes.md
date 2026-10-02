# Descrições das Vagas

Como o painel "Ver descrição" monta as seções de cada vaga, de onde vem o texto
e como recarregar as vagas que já estão no histórico.

Para instalar e rodar, veja [instalacao.md](instalacao.md).

---

## Onde o texto fica

O campo `description` da API **não** vai para `vagas_recentes.json` nem para
`vagas_gerais.json`. A descrição é organizada em seções por
`monitor/descricoes.py` e gravada em `data/descricoes.json`:

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

O painel mostra cada seção com seu título e cada bloco como foi escrito na vaga:
`item` vira bullet, `subtitulo` vira rótulo em negrito e `texto` vira parágrafo.

Ficar **fora** dos históricos é de propósito: o carregamento inicial do dashboard
não cresce, e o `assets/app.js` só baixa esse arquivo quando o usuário clica em
"Ver descrição". São ~380 KB (gzip) que ninguém precisa para listar as vagas.

### Retenção

O arquivo é reescrito a cada execução de `main.py` com **apenas os IDs que
continuam nos dois históricos** (`sincronizar_descricoes()`), então ele acompanha
a retenção de 7 dias e não cresce para sempre.

---

## As duas fontes, e por que

### 1. O HTML da página da vaga (`fonte: "html"`, ~70% dos casos)

O `jobUrl` da vaga publica a descrição em HTML no JSON-LD `JobPosting`
(schema.org) — o mesmo HTML que a Gupy renderiza, com `<h2>` de seção, `<li>` de
item e `<strong>` de subtítulo. É essa fonte que reproduz a leitura original.

A leitura é feita em `extrair_secoes_html()`: o HTML vira uma lista de blocos
(`titulo`, `subtitulo`, `item`, `texto`) e os blocos são agrupados em seções da
seção "Responsabilidades" em diante.

### 2. O texto `description` da API (`fonte: "texto"`, o resto)

Mesmo conteúdo, mas "achatado": os títulos viram texto colado no item anterior e a
marcação some. Exemplo real de uma reserva:

```text
…Responsabilidades e atribuiçõesO estagiário dará suporte às ações de
Desenvolvimento:Entendimento das demandas;Realizar documentações técnicas;
Desenvolvimento em Java/.NET (C#);…Requisitos e qualificaçõesObrigatório…
```

Nessa fonte a leitura é feita por texto, em três passos de
`extrair_secoes_texto()`:

1. **Começa** em "Responsabilidades e Atribuições" (com ou sem acento, "Principais
   responsabilidades") e vai **até o fim da descrição** — é isso que dá
   responsável, requisitos, informações adicionais e benefícios.
2. **Quebra em seções** nos títulos conhecidos ("Requisitos e qualificações",
   "Informações adicionais", "Benefícios", "Salário", "Jornada de trabalho",
   "Local de trabalho"), aceitando com ou sem acento e renomeando para um
   título único no painel.
3. **Quebra em itens** por `;`, quebra de linha, marcadores (`•`, `➢`), fim de
   frase seguido de maiúscula e `&nbsp;` — esse último só quando o trecho
   anterior já parece completo, para não cortar frase ao meio.

Em ambos os casos a leitura só começa em "Responsabilidades": o texto de
marketing que vem antes fica de fora. Vagas que não têm a seção (poucas) mostram
um aviso no painel com o link para a vaga original.

---

## Por que as páginas são buscadas em paralelo

Cada vaga é uma requisição independente, e a espera é de rede, não de CPU:
medido, um lote de 60 vagas consome **6,6% de um núcleo** enquanto 8 workers
esperam resposta. Threads são a ferramenta certa para isso — e `asyncio` só
ganharia algo se trocássemos `urllib` por uma dependência externa, o que o
projeto não faz.

| | por vaga | 600 vagas |
|---|---|---|
| sequencial | 0,57 s | ~5,7 min |
| 8 workers | **0,07 s** | **~45 s** (medido) |

O número está em `TRABALHADORES_PAGINA`, em `monitor/descricoes.py`; baixe para 4
se algum dia aparecer erro de requisição em massa. Nada mais na execução usa
threads: as 38 buscas da API continuam sequenciais com 1 s de intervalo, porque
ali o intervalo é proteção contra rate limit.

---

## Resiliência

> Um portal fora do ar não trava a execução: o `timeout` é de 12 s e, depois de 2
> falhas no mesmo domínio, o código desiste dele e usa o texto da API.

> Os portais que não publicam o JSON-LD (Itaú, Stefanini, Atento, Clicksign…)
> também não expõem a descrição por API: o `__NEXT_DATA__` do Next.js devolve
> só a introduction, truncada. Por isso essas vagas usam o texto da API — usar a
> versão truncada apagaria requisitos e benefícios.

---

## Recarregar as vagas que já estão no histórico

A descrição só é lida no instante em que a vaga é nova — depois a deduplicação
de `vagas_vistas.json` impede a vaga de voltar da API. Para preencher as vagas
que já estavam no histórico:

```bash
python monitor/backfill_descricoes.py
```

O script refaz as mesmas buscas de `monitor/consultas.py`, casa o resultado por
ID, busca o HTML de cada página e grava o que encontrar. São ~600 requisições
(uma por vaga, com intervalo), então leva alguns minutos. É seguro rodar quantas
vezes quiser: ele não toca nos dois arquivos de histórico, só reescreve o
`descricoes.json`. Vale a pena rodar de novo sempre que a extração melhorar.

O script imprime um resumo da divisão por fonte:

```text
============================================================
✅ 583 vaga(s) com descrição em data/descricoes.json
   ├── via HTML da página : 401
   └── via texto da API   : 182
⚠️  11 vaga(s) sem a seção (o dashboard avisa e linka a vaga)
============================================================
```

---

## Ver também

- [Instalação e uso](instalacao.md)
- [Buscas e filtros](buscas-e-filtros.md)
- [Automação CI/CD](automacao-ci-cd.md)