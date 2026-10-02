"""Simula as 24h de um dia contra os dois workflows, em memória.

Roda a máquina de estados do guardião sem HTTP, sem git e sem GitHub, e imprime
a linha do tempo. Serve para conferir de relance as três coisas que os testes
unitários não mostram juntas:

  1. a cadência real — o guardião roda 8x por dia, mas monitora 1x;
  2. quanto tempo um cron descartado fica sem recuperação;
  3. se o ping chega uma vez por dia, e em que hora.

    python3 monitor/checar_guardiao.py
"""

from datetime import date, datetime, time, timedelta, timezone

# O Python já põe a pasta do script no `sys.path`, então o import direto funciona
# tanto rodando `python monitor/checar_guardiao.py` quanto importado pelos testes.
from consola import configurar as configurar_consola

UTC = timezone.utc
HORA_DO_CRON = time(21, 30)
GRACE_CRON = 0
GRACE_GUARDIAO = 45
# A fase (hora 1, não 0) é o detalhe que faz o desenho funcionar: a janela das
# 22:17Z cai 47min DEPOIS do cron das 21:30, e é a ela que compete recuperar um
# cron descartado. Com janelas em 0,3,6...21 a última seria 21:17, antes do
# cron, e um descarte às 21:30 ficaria sem ninguém até a madrugada seguinte.
JANELAS_GUARDIAO = [time(h, 17) for h in (1, 4, 7, 10, 13, 16, 19, 22)]
CUSTO_MIN = 2  # duração aproximada de uma execução real

# Espelha guardiao.data_alvo, aqui simplificado para o script rodar sozinho.
def data_alvo(quando: datetime, grace: int) -> str:
    ref = quando - timedelta(minutes=grace)
    if ref.time() >= HORA_DO_CRON:
        return ref.date().isoformat()
    return (ref.date() - timedelta(days=1)).isoformat()


def simular(dia: date, cron_descartado: bool = False, sentinela_inicial=None):
    """Devolve [(datetime, texto)] de um dia inteiro, em ordem cronológica.

    sentinela_inicial simula um dia já em regime: sem ele, a primeira janela do
    guardião sempre "descobre" que o dia anterior não foi coberto e monitora
    duas vezes, o que só acontece no dia da instalação.
    """
    agenda = [(datetime.combine(dia, h, tzinfo=UTC), "guard") for h in JANELAS_GUARDIAO]
    agenda.append((datetime.combine(dia, HORA_DO_CRON, tzinfo=UTC), "cron"))
    agenda.sort()

    sentinela = sentinela_inicial
    linha = []
    pings = []

    for quando, papel in agenda:
        if papel == "cron" and cron_descartado:
            linha.append((quando, "cron       → DESCARTADO pelo GitHub"))
            continue

        grace = GRACE_CRON if papel == "cron" else GRACE_GUARDIAO
        alvo = data_alvo(quando, grace)

        if sentinela is None or sentinela < alvo:
            sentinela = alvo
            linha.append((quando, f"{papel:<10} → cobriu {alvo}  (ping)"))
            pings.append(quando)
        else:
            linha.append((quando, f"{papel:<10} → pulou (sentinela={sentinela})"))

    return linha, pings


def mostrar(titulo, dia, cron_descartado=False, sentinela_inicial=None, mostrar_linha=True):
    print("=" * 72)
    print(titulo)
    print("=" * 72)
    linha, pings = simular(dia, cron_descartado, sentinela_inicial)
    if mostrar_linha:
        for quando, texto in linha:
            print(f"  {quando:%H:%M}Z  {texto}")
    horarios = ", ".join(f"{p:%H:%M}Z" for p in pings)
    print(f"\n  pings: {len(pings)} ({horarios})")
    return linha, pings


def main():
    # A linha do tempo é cheia de "→" e "—", que o console do Windows não tem.
    configurar_consola()
    dia = date(2026, 9, 28)
    # Regime permanente: o cron do dia anterior já registrou 27/09.
    ontem = (dia - timedelta(days=1)).isoformat()

    _, p1 = mostrar("CENÁRIO 1 — regime normal, o cron das 21:30 roda", dia, sentinela_inicial=ontem)
    print(f"\n  {len(p1)} monitoramento em 9 execuções. As outras 8 são no-ops de ~20s.\n")

    _, p2 = mostrar(
        "CENÁRIO 2 — o GitHub descarta o cron das 21:30",
        dia,
        cron_descartado=True,
        sentinela_inicial=ontem,
    )
    coberto = [p for p in p2 if p.date() == dia]
    if coberto:
        perda = coberto[0] - datetime.combine(dia, HORA_DO_CRON, tzinfo=UTC)
        print(f"\n  tempo sem cobertura: {perda}")
        print("  (limite do desenho: 3h, a maior janela entre disparos do guardião)\n")
    else:
        print("\n  o dia NÃO foi coberto por ninguém — o heartbeat externo teria avisado.\n")

    mostrar("CENÁRIO 3 — dia da instalação (sentinel ainda não existe)", dia, mostrar_linha=False)
    print("\n  Monitora duas vezes: a janela de 00:17Z não tem como saber que")
    print("  27/09 já foi coberto e hedgeassume que faltou. Acontece uma vez.\n")

    print("=" * 72)
    print("RESUMO")
    print("=" * 72)
    print(f"  cadence do guardião : 8x/dia (minuto 17 de cada 3h)")
    print(f"  monitoramento/dia   : 1 (idempotente, qualquer um dos 9 pode fazer)")
    print(f"  ping/dia            : 1, por volta de 21:31Z (18:31 em Brasília)")
    print(f"  pior caso sem cobertura: 3h")
    print("  pior caso sem aviso    : o dia inteiro, se GitHub E guardião caírem juntos")
    print("                         → só o heartbeat externo cobre esse caso.")


if __name__ == "__main__":
    main()
