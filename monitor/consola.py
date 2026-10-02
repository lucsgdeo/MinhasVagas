"""Faz o terminal aceitar os caracteres que o programa imprime.

O log usa setas, travessões e emojis. No Linux o console é UTF-8 e isso passa; no
Windows o console legado é `cp1252`, que não tem nenhum deles, e o `print`
levanta `UnicodeEncodeError` — o script morre na primeira linha de saída, antes
de consultar qualquer vaga. Não é o Windows sendo "diferente": é a codificação
padrão dele.

A correção é reconfigurar o fluxo, não trocar os caracteres do código. Trocá-los
resolveria o Windows, mas pioraria o log em todas as plataformas — e o emoji é
parte do que torna a saída legível.
"""

import sys


def configurar() -> None:
    """Coloca `stdout` e `stderr` em UTF-8, tolerante a quem não suportar.

    `errors="replace"` é a rede de segurança para o console não aceitar UTF-8
    mesmo reconfigurado: degrada para `?` em vez de derrubar o monitoramento no
    meio da execução.

    Os dois `try` cobrem casos que aparecem de verdade aqui. O primeiro é o
    `io.StringIO` que os testes injetam com `redirect_stdout`: existe no Python
    3.11+, não tem `reconfigure` antes disso, e o teste do guardião imprime por
    ele. O segundo é o `reconfigure` recusando o que se pede. Nos dois, o
    programa continua — o pior caso é um caractere vir `?` no log.
    """
    for fluxo in (sys.stdout, sys.stderr):
        reconfigurar = getattr(fluxo, "reconfigure", None)
        if reconfigurar is None:
            continue
        try:
            reconfigurar(encoding="utf-8", errors="replace")
        except (ValueError, OSError):
            pass
