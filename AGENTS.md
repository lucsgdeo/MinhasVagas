# AGENTS.md

Projeto em português (código, comentários, commits, UI): mantenha o idioma. Detalhes de fontes, filtros e configuração estão no README.md.

## Comandos
- Testes (sem rede): `npm test`; um arquivo: `npx vitest run src/dominio/filtroDeVagas.test.ts`
- Tipos: `npm run typecheck`. Build: `npm run build`. Site local: `npm run dev`.
- Pesquisa real (chama os sites e **reescreve `public/data/`**): `npm run pesquisar`. Para não alterar os dados, use `PASTA_DE_DADOS=<pasta temporária>`.
- Não há lint nem formatter.

## Estrutura
- Clean Architecture: `src/dominio` ← `src/aplicacao` ← `src/infraestrutura` e `src/apresentacao`; `src/principal` monta as dependências. Domínio e aplicação não importam infraestrutura.
- `src/infraestrutura/web` roda no navegador; o resto da infraestrutura (cheerio, `node:fs`) roda só no Node. Não importe esse resto em `apresentacao`.
- `public/data/` é gerado pela pesquisa e commitado pelo bot: não o commite por acaso ao mexer em código.

## Armadilhas
- Filtros (`src/dominio/filtroDeVagas.ts`): termos **sem acento**, porque o título é normalizado antes; acento cria uma alternativa morta sem erro. A ordem das regras importa. Descartar errado esconde a vaga para sempre, então confira o efeito em dados reais.
- `NUNCA_TECNOLOGIA` vence a lista de tecnologia: "RPA" também é recuperação pós-anestésica, e "automação" também é industrial.
- `vagas_vistas.json` só importa para vaga sem data. Vaga com data é reavaliada a cada pesquisa, para filtros e buscas novas valerem para ela.
- `buscaPrecisa: false` exige tecnologia no título. Use em sites cuja busca traz cargos de outras áreas.
- A ordem das consultas define a categoria de reserva, e a ordem em `criarFontes` decide qual fonte fica em vaga repetida.
- API da Gupy: `limit` máximo é 100 (acima dá HTTP 400), não aceita exclusão de termos e busca por radical, ignorando acento.
- LinkedIn responde HTTP 429 com facilidade; não reduza `INTERVALO_PARA_EVITAR_BLOQUEIO_MS`. Não contorne bloqueios anti-bot (Indeed e Glassdoor ficaram de fora por isso).
- IDs têm o formato `<fonte>-<id original>`. Marcações antigas do `localStorage` só com número são convertidas para `gupy-<id>` em `armazenamentoLocal.ts`.
- `vistasNoCarregamento` é um instantâneo: marcar "Vista" não remove o card até recarregar. É intencional.
- Temas: a cor é `data-theme` no `<html>` e o escuro é `data-mode="dark"`; cor clara fixa no CSS exige override em `[data-mode="dark"]`. Persistência em `minhasvagas_theme` / `minhasvagas_mode`.
- O botão "Pesquisar vagas" é só um link para o workflow no GitHub. Nunca coloque credencial no front: tudo nele é público.

## CI
- `pesquisar-vagas.yml` só roda por `workflow_dispatch`; não há cron. Ele chama `publicar-site.yml`, porque push feito com `GITHUB_TOKEN` não dispara outros workflows.
- `publicar-site.yml` exige Pages configurado com a origem "GitHub Actions".
- Commits do bot usam `[skip ci]`.
