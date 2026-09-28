import time

from common import (
    VAGAS_GERAIS_FILE_DEFAULT,
    VAGAS_RECENTES_FILE_DEFAULT,
    carregar_env,
    executar_monitoramento,
)
from consultas import DESTINOS, gerar_consultas

ARQUIVOS = {
    "tech": VAGAS_RECENTES_FILE_DEFAULT,
    "geral": VAGAS_GERAIS_FILE_DEFAULT,
}

INTERVALO_ENTRE_CONSULTAS = 1  # evita rate limit da API


def main():
    carregar_env()
    print("=" * 60)
    print("🚀 INICIANDO MONITORAMENTO DE VAGAS GUPY")
    print("=" * 60)

    total_novas = 0
    resumo = []

    for consulta in gerar_consultas():
        print(f"\n--- {consulta.rotulo} ({DESTINOS[consulta.destino]}) ---")
        try:
            novas = executar_monitoramento(
                rotulo=consulta.rotulo,
                api_url=consulta.url,
                vagas_recentes_file=ARQUIVOS[consulta.destino],
            )
            total_novas += novas
            resumo.append((consulta.rotulo, novas))
        except Exception as e:
            print(f"❌ Erro ao processar {consulta.rotulo}: {e}")
            resumo.append((consulta.rotulo, f"Erro: {e}"))

        time.sleep(INTERVALO_ENTRE_CONSULTAS)

    print("\n" + "=" * 60)
    print("📊 RESUMO DA EXECUÇÃO")
    print("=" * 60)
    for rotulo, qtd in resumo:
        print(f"  • {rotulo:<26}: {qtd}")
    print("-" * 60)
    print(f"Total de novas vagas notificadas: {total_novas}")
    print("=" * 60)


if __name__ == "__main__":
    main()
