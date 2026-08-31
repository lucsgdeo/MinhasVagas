import time
from common import carregar_env
import suporte
import suporte_remoto
import ti
import ti_remoto
import infra
import service_desk
import service_desk_remoto
import junior
import junior_remoto
import help_desk
import help_desk_remoto

MODULOS = [
    suporte,
    suporte_remoto,
    ti,
    ti_remoto,
    infra,
    service_desk,
    service_desk_remoto,
    junior,
    junior_remoto,
    help_desk,
    help_desk_remoto,
]


def main():
    carregar_env()
    print("=" * 60)
    print("🚀 INICIANDO MONITORAMENTO DE VAGAS GUPY")
    print("=" * 60)

    total_novas_geral = 0
    resultados = []

    for mod in MODULOS:
        nome = getattr(mod, "TOPIC_NAME", mod.__name__)
        print(f"\n--- Processando: {nome} ---")
        try:
            novas = mod.processar_vagas()
            total_novas_geral += novas
            resultados.append((nome, "Sucesso", novas))
        except Exception as e:
            print(f"❌ Erro ao processar módulo {nome}: {e}")
            resultados.append((nome, f"Erro: {e}", 0))

        # Pequeno intervalo para respeitar taxas de requisição
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
