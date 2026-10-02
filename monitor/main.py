import time

from common import (
    VAGAS_GERAIS_FILE_DEFAULT,
    VAGAS_RECENTES_FILE_DEFAULT,
    carregar_env,
    executar_monitoramento,
)
from consola import configurar as configurar_consola
from consultas import DESTINOS, gerar_consultas

ARQUIVOS = {
    "tech": VAGAS_RECENTES_FILE_DEFAULT,
    "geral": VAGAS_GERAIS_FILE_DEFAULT,
}

INTERVALO_ENTRE_CONSULTAS = 1  # evita rate limit da API

# No resumo, "Sistemas" entra junto de "Desenvolvimento": o botão "Dev" do
# dashboard já cobre os dois (ver o comentário em BUSCAS), então o terminal
# mostra a mesma divisão por área que os filtros da tela mostram.
GRUPOS_DO_RESUMO = {
    "Sistemas": "Desenvolvimento",
    "Sistemas Remoto": "Desenvolvimento Remoto",
}


def main():
    # Primeiro de tudo, e antes de qualquer `print`: no Windows o console é
    # cp1252 e morre no primeiro emoji sem isto.
    configurar_consola()
    carregar_env()
    print("=" * 60)
    print("🚀 INICIANDO MONITORAMENTO DE VAGAS GUPY")
    print("=" * 60)

    total_novas = 0
    resumo = []

    for consulta in gerar_consultas():
        print(f"\n--- {consulta.rotulo_exibicao} ({DESTINOS[consulta.destino]}) ---")
        try:
            novas = executar_monitoramento(
                rotulo=consulta.rotulo,
                api_url=consulta.url,
                vagas_recentes_file=ARQUIVOS[consulta.destino],
                rotulo_exibicao=consulta.rotulo_exibicao,
                destino=consulta.destino,
            )
            total_novas += novas
            resumo.append((consulta.destino, consulta.rotulo, novas))
        except Exception as e:
            print(f"❌ Erro ao processar {consulta.rotulo_exibicao}: {e}")
            resumo.append((consulta.destino, consulta.rotulo, None))

        time.sleep(INTERVALO_ENTRE_CONSULTAS)

    # O resumo agrupa por destino e por área: cinco buscas caem no mesmo rótulo
    # (dev, software, devops, desenvolvedor, desenvolvimento) e "Sistemas" some
    # dentro de "Desenvolvimento". O detalhe de qual busca trouxe cada vaga fica
    # no log de cada consulta.
    totais = {}
    com_erro = {}
    for destino, rotulo, qtd in resumo:
        grupo = GRUPOS_DO_RESUMO.get(rotulo, rotulo)
        if (destino, grupo) not in totais:
            totais[(destino, grupo)] = 0
            com_erro[(destino, grupo)] = 0
        if qtd is None:
            com_erro[(destino, grupo)] += 1
        else:
            totais[(destino, grupo)] += qtd

    for titulo, destino in (("VAGAS TECH", "tech"), ("VAGAS GERAIS", "geral")):
        grupos = sorted(
            ((grupo, total) for (dest, grupo), total in totais.items() if dest == destino),
            key=lambda item: (-item[1], item[0]),
        )
        if not grupos:
            continue

        print("\n" + "=" * 60)
        print(f"📊 {titulo} — novas por área ({DESTINOS[destino]})")
        print("=" * 60)
        largura = max(len(grupo) for grupo, _ in grupos)
        for grupo, total in grupos:
            linha = f"  • {grupo:<{largura}}  {total}"
            if com_erro[(destino, grupo)]:
                linha += f"   ({com_erro[(destino, grupo)]} busca(s) com erro)"
            print(linha)
        print("-" * 60)

    print(f"Total de novas vagas notificadas: {total_novas}")
    print("=" * 60)


if __name__ == "__main__":
    main()
