import time

from common import (
    VAGAS_TI_GERAL_FILE_DEFAULT,
    VAGAS_SUPORTE_FILE_DEFAULT,
    carregar_env,
    executar_monitoramento,
)
from consultas import DESTINOS, gerar_consultas
from fontes_externas import gerar_buscas_externas

ARQUIVOS = {
    "suporte": VAGAS_SUPORTE_FILE_DEFAULT,
    "geral": VAGAS_TI_GERAL_FILE_DEFAULT,
}

INTERVALO_ENTRE_CONSULTAS = 1  # evita rate limit da API
INTERVALO_FONTES_EXTERNAS = 6  # LinkedIn devolve 429 com buscas seguidas

# Mapa rótulo -> grupo no resumo do terminal (vazio: cada rótulo é um grupo).
GRUPOS_DO_RESUMO = {}


def main():
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

    # Fontes externas, depois da Gupy: a Gupy rotula primeiro e a mesma vaga
    # não aparece duas vezes. Uma fonte que bloquear (429, captcha) é pulada
    # pelo resto da rodada, sem insistir — insistir é o que gera bloqueio maior.
    fontes_bloqueadas = set()
    for fonte, termo, rotulo, funcao in gerar_buscas_externas():
        exibicao = f'{fonte} "{termo}" → {rotulo}'
        print(f"\n--- {exibicao} ({DESTINOS['suporte']}) ---")
        if fonte in fontes_bloqueadas:
            print(f"⏭️  {fonte} bloqueou nesta rodada; pulando.")
            resumo.append(("suporte", f"{fonte}", None))
            continue
        erro = []

        def buscar(funcao=funcao, termo=termo, rotulo=rotulo, erro=erro):
            try:
                return funcao(termo, rotulo)
            except Exception as err:
                erro.append(err)
                raise

        novas = executar_monitoramento(
            rotulo=rotulo,
            api_url="",
            vagas_recentes_file=ARQUIVOS["suporte"],
            rotulo_exibicao=exibicao,
            destino="suporte",
            buscar=buscar,
        )
        if erro:
            if getattr(erro[0], "code", None) in (403, 429, 999):
                fontes_bloqueadas.add(fonte)
            resumo.append(("suporte", fonte, None))
        else:
            total_novas += novas
            resumo.append(("suporte", fonte, novas))
        time.sleep(INTERVALO_FONTES_EXTERNAS)

    # O resumo agrupa por destino e por área: várias buscas caem no mesmo rótulo
    # (infraestrutura, redes, noc...). O detalhe de qual
    # busca trouxe cada vaga fica no log de cada consulta.
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

    for titulo, destino in (("SUPORTE T.I.", "suporte"), ("T.I. EM GERAL", "geral")):
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
