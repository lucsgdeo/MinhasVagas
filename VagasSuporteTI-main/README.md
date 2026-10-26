# 🖥️ Vagas de Suporte T.I. — Dashboard de Vagas

Adaptação do [MinhasVagas](https://github.com/lucsgdeo/MinhasVagas) para quem procura vaga de **suporte técnico de T.I.**: N1, N2, Júnior e Help Desk / Service Desk.

O monitor em Python consulta a API pública da Gupy (e as páginas públicas do LinkedIn, InfoJobs e Catho) todo dia, guarda as vagas em `data/` e o GitHub Pages serve o dashboard.

---

## 📌 O que mudou em relação ao **Vagas de Suporte T.I. — Dashboard de Vagas**

| Este projeto |
|---|---|---|
| Aba principal || **Suporte T.I.** (Todas, Suporte N1, Suporte N2, Suporte Jr, Help Desk, Sem nível) |
| Segunda aba | **Vagas Gerais** (assistente, júnior, auxiliar de qualquer área) | **T.I. em Geral** (Infraestrutura, Redes, Técnico de Informática, Analista de TI, Assistente/Auxiliar) |
| Rótulo do card | vem da busca | na aba Suporte, vem do **título**: "Analista de Suporte N2" → *Suporte N2* |
| Filtro de cargo | só em Vagas Gerais | nas duas abas. No suporte, **N1/N2 Pleno fica**; sênior, gestão e N3 saem |
| Filtro de escopo | tira advogado, estágio, licença de software | tira suporte de vendas, comercial, acadêmico, logístico, call center e estágio |
| Janela / retenção | 30 dias | **14 dias** no Suporte, 7 dias em T.I. em Geral |
| Histórico | `data/vagas_legalizacao.json` | `data/vagas_suporte.json` e `data/vagas_ti_geral.json` |

A aba **Horários de Postagem**, os temas, o modo escuro, o painel de descrição e a marcação "Vista" funcionam igual.

---

## 🧭 Buscas

Ficam na lista `BUSCAS` de `monitor/consultas.py`. Cada linha gera uma consulta presencial (São Paulo + ABC) e uma remota.

| Aba | Termos (`jobName`) |
|---|---|
| Suporte T.I. | `suporte n1`, `suporte n2`, `help desk`, `service desk`, `suporte técnico`, `técnico de suporte`, `analista de suporte`, `suporte jr`, `suporte ti`, `suporte` |
| T.I. em Geral | `infraestrutura`, `redes`, `noc`, `técnico de informática`, `técnico de ti`, `analista de ti`, `assistente de ti`, `auxiliar de ti`, `ti` |

A API da Gupy busca no **título**, ignora acentos e devolve no máximo 100 vagas por consulta — por isso os termos específicos vêm antes do amplo `suporte`.

As cidades ficam em `CIDADES`, no mesmo arquivo (e em `CIDADES_ACEITAS`/`CIDADES_CATHO` de `monitor/fontes_externas.py`).

### Nível (N1, N2, Jr, Help Desk)

`rotulo_suporte()` em `monitor/descricoes.py` lê o título: `N1`, `Nível 1`, `1º nível` → **Suporte N1**; o mesmo para N2; quem aceita os dois vira **Suporte N1/N2** e aparece nos dois botões. Sem nível, `Jr`/`Júnior` → **Suporte Jr**; `Help Desk`/`Service Desk` → **Help Desk**; o resto → **Sem nível**.

### Filtros de escopo e de cargo

- `suporte_fora_do_escopo()` — T.I. no título (TI, Help Desk, Sistemas, Redes, Infra…) sempre fica; área claramente de fora (vendas, comercial, acadêmico, logística, usinagem…) sai; o que não tem sinal nenhum ("Analista de Suporte") **fica**.
- `cargo_suporte_para_descartar()` — N1/N2 ficam mesmo "Pleno"; sênior, especialista, coordenador, supervisor, líder e N3 saem.
- `ti_geral_fora_do_escopo()` — na aba T.I. em Geral a vaga só entra se o título citar tecnologia (tira "Redes Sociais", "Infraestrutura Civil").

---

## 🌐 Outras fontes: LinkedIn, InfoJobs e Catho

O módulo `monitor/fontes_externas.py` lê as **páginas públicas de resultado**, sem login, para `suporte técnico`, `help desk` e `suporte n1`. As vagas entram na aba Suporte T.I., com os mesmos filtros e uma etiqueta com o site de origem.

- Se um site responder 403/429, ele é pulado pelo resto da rodada e a Gupy segue normalmente. O LinkedIn costuma bloquear acessos vindos do GitHub Actions.
- Só as vagas da Gupy têm descrição no painel; nas demais o botão leva à vaga original.
- Os leitores dependem do HTML de cada site: se o layout mudar, aquela fonte passa a trazer zero vagas.
- Essa leitura automática pode contrariar os termos de uso desses sites. Para desligar uma fonte, remova-a de `FONTES`.

---

## 🚀 Como executar

```bash
python monitor/main.py                                   # atualiza data/*.json (usa a API real)
python -m unittest discover -s . -p "test_*.py"          # testes, sem rede
python -m http.server                                    # abre o site em http://localhost:8000
```

Usa só a biblioteca padrão do Python 3.11+.

---

## 🔄 Automação (GitHub Actions)

- `main.yml` roda **todo dia às 18h30** (21:30 UTC) e também pode ser disparado pela aba **Actions**. Ele executa o monitor e comita o `data/`.
- `guardiao.yml` roda a cada 3h e só executa o monitor quando a execução do dia não aconteceu.
- O secret opcional `HC_PING_URL` ativa um heartbeat externo.

Para publicar: crie um repositório no GitHub, envie estes arquivos, ative **Settings → Pages** (branch principal, pasta raiz) e **Settings → Actions → General → Workflow permissions → Read and write**.
