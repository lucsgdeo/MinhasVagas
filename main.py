import time
from common import carregar_env
from topics import TODOS_TOPICOS


def main():
    carregar_env()
    print("=" * 60)
    print("🚀 INICIANDO MONITORAMENTO DE VAGAS GUPY")
    print("=" * 60)

    total_novas_geral = 0
    resultados = []

    for mod in TODOS_TOPICOS:
        nome = getattr(mod, "TOPIC_NAME", mod.__name__)
        print(f"\n--- Processando: {nome} ---")
        try:
            novas = mod.processar_vagas()
            total_novas_geral += novas
            resultados.append((nome, "Sucesso", novas))
        except Exception as e:
            print(f"❌ Erro ao processar módulo {nome}: {e}")
            resultados.append((nome, f"Erro: {e}", 0))

        # Intervalo entre tópicos para evitar rate limits da API e do Telegram
        time.sleep(1)

    print("\n" + "=" * 60)
    print("📊 RESUMO DA EXECUÇÃO")
    print("=" * 60)
    for nome, status, qtd in resultados:
        if status == "Sucesso":
            print(f"  • {nome:<22}: {qtd} vaga(s) nova(s)")
        else:
            print(f"  • {nome:<22}: {status}")
    print("-" * 60)
    print(f"Total de novas vagas notificadas: {total_novas_geral}")
    print("=" * 60)


if __name__ == "__main__":
    main()
