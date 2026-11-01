# MinhasVagas

Painel de vagas de **TI/Tecnologia** de nível de entrada e intermediário, reunidas dos principais sites de emprego do Brasil. O site é estático e fica no GitHub Pages. A pesquisa roda no GitHub Actions: o botão **Pesquisar vagas** abre a página do workflow, onde se clica em **Run workflow**.

## Fontes

| Site | Como é lido | Descrição da vaga |
|---|---|---|
| Gupy | API pública | Página da vaga, com a API de reserva |
| InfoJobs | HTML da busca | JSON-LD da página da vaga |
| Catho | HTML da busca | JSON-LD da página da vaga |
| Vagas.com | HTML da busca | JSON-LD da página da vaga |
| Remotar | API pública | Vem na própria API |
| LinkedIn | Endpoint público de visitantes | Só no site original |

Ficam de fora:

- **Indeed e Glassdoor:** respondem 403 a clientes automatizados, e o projeto não contorna bloqueios.
- **Programathor:** responde 403 aos IPs do GitHub Actions.
- **BNE:** a listagem só trazia vagas de meses atrás.
- **Sólides, Trampos e Empregos.com.br:** não têm dados estáveis ou data de publicação na listagem.

### Limitações

- O `robots.txt` do **LinkedIn** proíbe esse acesso, e o site responde HTTP 429 a parte das buscas. Para desligá-lo, remova `criarFonteLinkedin` de `src/infraestrutura/fontes/index.ts`.
- Os sites lidos por HTML podem mudar de layout sem aviso. Quando isso acontece, a fonte para de trazer vagas e o log avisa: `<fonte> não trouxe nenhuma vaga`.
- Sites podem tratar os IPs do GitHub Actions de forma diferente de uma conexão residencial. Confira o resultado por fonte no log da execução e em `public/data/ultima_execucao.json`.
- Se um site responder 403, as demais consultas dele são canceladas. Em 429, a pesquisa pausa 60 s e tenta uma vez; se continuar limitada, cancela as consultas restantes daquele site. O site mostra "resultado incompleto" no topo.

## Arquitetura

Clean Architecture, com as dependências sempre apontando para dentro:

```text
src/
├── dominio/          Regras puras: Vaga, filtros de cargo/área/local, categorias e buscas
├── aplicacao/        Casos de uso (executarPesquisa, filtrarVagas) e portas
├── infraestrutura/
│   ├── fontes/       Um adaptador por site: monta a URL e interpreta a resposta
│   ├── descricoes/   Extrai as seções da descrição (HTML e texto)
│   ├── persistencia/ Grava os JSON em public/data
│   └── web/          Adaptadores do navegador: catálogo e localStorage
├── apresentacao/     Interface React
├── principal/        Ponto de entrada da pesquisa, onde as dependências são montadas
└── config.ts         Endereço do workflow de pesquisa
public/data/          Dados gerados pela pesquisa e publicados com o site
```

### Como adicionar um site

1. Crie o adaptador em `src/infraestrutura/fontes/`, implementando `FonteDeVagas`.
2. Inclua o id e o nome em `src/dominio/vaga.ts`. O filtro por site da interface sai dessa lista.
3. Registre a fonte em `criarFontes`, em `fontes/index.ts`. A ordem é a prioridade em vaga repetida.
4. Teste o interpretador em `fontes.test.ts`.

Use `buscaPrecisa: false` quando a busca do site trouxer cargos parecidos de outras áreas: o título passa a precisar citar tecnologia.

## Regras de filtragem

Ficam em `src/dominio/filtroDeVagas.ts`, nesta ordem:

1. **Cargo avançado sai** (sênior, pleno, especialista, gerente, staff, lead...), a menos que o título também aceite nível de entrada, como `JR/PL`.
2. **Tecnologia inequívoca fica** (`TI`, `software`, `SAP`, `dados`...), mesmo citando outra área: `Estágio em Suprimentos com SAP`.
3. **Área de fora sai** (`FORA_DE_TECNOLOGIA`), mesmo com palavra ambígua: `Encanador de Infra`.
4. **Estágio com área nomeada sem sinal de tecnologia sai**: `Estágio em Processos`.
5. **Em site de busca aproximada, o título precisa citar tecnologia.** Nas demais fontes, título sem área passa, porque descartar errado esconde a vaga para sempre.

Termos são escritos **sem acento**, porque a comparação normaliza o título antes. Presenciais valem para São Paulo, São Bernardo do Campo, Santo André, São Caetano do Sul e Diadema. Remotas valem para qualquer lugar.

Publicadas há mais de 7 dias são ignoradas, e o histórico guarda o mesmo período. Como a pesquisa é manual, uma vaga só é captada se houver uma execução nesse intervalo.

**Automação:** RPA, UiPath, Power Automate, Power Platform e low-code têm categoria própria. Homônimos ficam de fora (`NUNCA_TECNOLOGIA`): RPA hospitalar (recuperação pós-anestésica) e automação industrial, predial ou residencial.

## Comandos

```bash
npm ci
npm run dev        # site local
npm test           # testes, sem rede
npm run typecheck
npm run build      # gera dist/
npm run pesquisar  # chama os sites de verdade e reescreve public/data
```

Para testar a pesquisa sem alterar os dados: `PASTA_DE_DADOS=/tmp/teste npm run pesquisar`.

## Configuração no GitHub

Em *Settings → Pages → Build and deployment → Source*, escolha **GitHub Actions**.

## Como iniciar a pesquisa

1. Clique em **Pesquisar vagas** no site. O GitHub abre na página do workflow.
2. Clique em **Run workflow**. É preciso estar logado com uma conta que tenha permissão de escrita no repositório.
3. Quando a execução terminar, recarregue o site para ver as vagas novas.

O site não guarda senha nem token. Por isso ele não inicia a pesquisa sozinho nem mostra o andamento: isso fica na página do GitHub.

## Workflows

- `pesquisar-vagas.yml`: roda só sob demanda (**Run workflow** no GitHub), grava `public/data` em `master` e publica o site.
- `publicar-site.yml`: testa, gera e publica o site em cada push para `master`.
