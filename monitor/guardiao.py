"""Sentinela de frescor: responde "o disparo de hoje já foi coberto?".

O GitHub Actions descarta execuções agendadas sem deixar rastro nenhum. Medimos
175 execuções contra ~705 eventos agendados em 29 dias de cron horário: 75% dos
disparos nunca viraram run. Não falharam, simplesmente sumiram, e o máximo de
atraso observável ficou truncado em 1h justamente porque os que atrasaram mais
não têm como ser distinguidos dos que não existiram.

Um workflow agendado não serve para detectar isso: ele usaria o mesmo agendador
que falhou, e as duas falhas seriam correlacionadas. Por isso a checagem se
divide em duas peças independentes:

* este arquivo + `guardiao.yml` tentam *recuperar* a execução perdida;
* o aviso de que algo quebrou vem de fora do GitHub (ping de heartbeat), e é
  configurado em main.yml.

O guardião sozinho não avisa ninguém. Ele só evita que um dia inteiro de vagas
se perca em silêncio — se o GitHub e o guardião caírem juntos, o dia some de
qualquer forma, e quem avisa é o heartbeat externo.
"""

import argparse
import json
import os
from datetime import datetime, time, timedelta, timezone
from zoneinfo import ZoneInfo

# Espelha o `schedule` de main.yml: 21:30 UTC = 18:30 em Brasília. Fica
# duplicado em vez de importado porque o YAML não é importável, e a alternativa
# seria o guardião ler o próprio workflow procurando o cron, que é frágil.
HORA_DO_CRON_UTC = time(21, 30)

# Quanto o guardião espera antes de dar o disparo por perdido. Serve a dois
# objetivos: deixar o cron diário terminar em paz (leva ~30s) e evitar que os dois
# workflows terminem juntos, cada um tentando push para a master. O valor é
# folgado de propósito — recuperar tarde custa horas, recuperar cedo custa um
# conflito de push que perde a run depois de todo o trabalho do monitoramento.
GRACE_PADRAO_MIN = 45

FUSO_SP = ZoneInfo("America/Sao_Paulo")

# Mesma convenção de common.py: este módulo mora em `monitor/`, então sobe dois
# níveis. Recalculado aqui em vez de importado de propósito — `common` puxa
# `descricoes` e afins, e uma checagem de frescor que roda 8x por dia não
# deveria carregar nada além da biblioteca padrão.
PASTA_PROJETO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PASTA_DADOS = os.path.join(PASTA_PROJETO, "data")
ARQUIVO_SENTINELA = os.path.join(PASTA_DADOS, "ultimo_monitoramento.json")


def agora_utc() -> datetime:
    return datetime.now(timezone.utc)


def data_alvo(grace_min: int, agora: datetime = None) -> str:
    """Data (ISO, UTC) do disparo das 21:30 que já venceu.

    "Venceu" significa: já passou `grace_min`. Antes das 21:30 do dia corrente o
    disparo de hoje ainda não aconteceu, então a resposta é o dia anterior.

    Esse cuidado é o que impede o guardião de rodar um monitoramento extra às
    21:17, treze minutos antes do cron oficial. Chamar com grace_min=0 dá o
    comportamento oposto, que é o que o próprio cron usa para registrar o dia em
    que foi disparado.

    O `agora` é injetável para permitir testar os horários sem esperar a meia-noite.
    """
    ref = (agora or agora_utc()) - timedelta(minutes=grace_min)
    if ref.time() >= HORA_DO_CRON_UTC:
        return ref.date().isoformat()
    return (ref.date() - timedelta(days=1)).isoformat()


def ler_sentinela() -> dict | None:
    if not os.path.exists(ARQUIVO_SENTINELA):
        return None
    try:
        with open(ARQUIVO_SENTINELA, encoding="utf-8") as f:
            return json.load(f)
    except (json.JSONDecodeError, OSError):
        # Sentinela ilegível é tratada como ausente: o pior caso é um
        # monitoramento a mais, que é barato. O alternativa — tratar como
        # válida — deixaria o guardião cego para sempre.
        return None


def registrar(origem: str, grace_min: int) -> str:
    agora = agora_utc()
    registro = {
        "data": data_alvo(grace_min),
        "hora_utc": agora.strftime("%Y-%m-%dT%H:%M:%SZ"),
        "hora_br": agora.astimezone(FUSO_SP).strftime("%Y-%m-%dT%H:%M:%S%z"),
        "origem": origem,
        "run_id": os.environ.get("GITHUB_RUN_ID", ""),
    }
    os.makedirs(PASTA_DADOS, exist_ok=True)
    with open(ARQUIVO_SENTINELA, "w", encoding="utf-8") as f:
        json.dump(registro, f, indent=2, ensure_ascii=False)
        f.write("\n")
    return registro["data"]


def esta_atrasado(ultima: str | None, alvo: str) -> bool:
    """Diz se o disparo de `alvo` ainda não foi coberto.

    Datas em ISO (YYYY-MM-DD) ordenam lexicograficamente, então comparar as
    strings resolve sem parse extra e trata virada de mês/ano de graça. Uma data
    futura em relação ao alvo — relógio adiantado ou sentinel corrompida — não
    conta como atraso, para que o guardião não fique refazendo trabalho o dia
    inteiro por causa de um ping torto.
    """
    return ultima is None or ultima < alvo


def emitir_outputs(**valores) -> None:
    """Publica outputs para o `if:` do workflow ler."""
    destino = os.environ.get("GITHUB_OUTPUT")
    if not destino:
        return
    with open(destino, "a", encoding="utf-8") as f:
        for chave, valor in valores.items():
            f.write(f"{chave}={valor}\n")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    sub = parser.add_subparsers(dest="comando", required=True)

    p_verificar = sub.add_parser("verificar", help="diz se o disparo venceu e ainda não foi coberto")
    p_verificar.add_argument("--grace", type=int, default=GRACE_PADRAO_MIN)

    p_escrever = sub.add_parser("escrever", help="registra que o disparo foi coberto")
    p_escrever.add_argument("--origem", default="manual")
    p_escrever.add_argument("--grace", type=int, default=GRACE_PADRAO_MIN)
    p_escrever.add_argument(
        "--se-vencido",
        action="store_true",
        help=(
            "não grava se o disparo alvo já estiver coberto. O guardião usa isto: "
            "ele chega aqui só quando decidiu recuperar, e a checagem é o passo "
            "anterior. Sem a flag ele sobrescreveria a sentinel mesmo numa corrida "
            "com o cron, apagando a prova de qual dos dois realmente cobriu o dia."
        ),
    )

    args = parser.parse_args()

    if args.comando == "verificar":
        alvo = data_alvo(args.grace)
        ultima = (ler_sentinela() or {}).get("data")
        atrasado = esta_atrasado(ultima, alvo)
        emitir_outputs(alvo=alvo, ultima=ultima or "", atrasado="true" if atrasado else "false")
        # Sai com 0 mesmo quando atrasado: quem decide o que fazer é o `if:` do
        # workflow. Um exit 1 aqui coloriria a run de vermelho mesmo em operação
        # normal, e o guardião passa a gerar ruído justamente no dia em que o
        # GitHub já está se comportando mal.
        return 0

    if args.se_vencido:
        alvo = data_alvo(args.grace)
        if not esta_atrasado((ler_sentinela() or {}).get("data"), alvo):
            print(f"Disparo {alvo} já estava coberto; sentinel preservada.")
            return 0

    data = registrar(args.origem, args.grace)
    emitir_outputs(data=data)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
