"""Preenche `descricoes.json` das vagas que já estão no histórico.

Uso:  python backfill_descricoes.py

Por que existe: a descrição da vaga só é lida no mesmo instante em que a vaga é
nova. Depois disso a deduplicação de `vagas_vistas.json` impede a vaga de voltar
da API, então as vagas já salvas em `vagas_recentes.json`/`vagas_gerais.json`
ficariam sem descrição para sempre. Este script refaz as mesmas buscas de
`consultas.py`, casa o resultado por ID e monta a descrição de cada vaga.

A montagem é a mesma do dia a dia (`descrever_vaga()`): tenta o HTML da página
da vaga e, se não conseguir, usa o texto achatado da API como reserva.

É seguro rodar quantas vezes quiser: ele só escreve as vagas que ainda estão no
histórico e não altera os dois arquivos de histórico.
"""

import json
import time

from common import (
    VAGAS_GERAIS_FILE_DEFAULT,
    VAGAS_RECENTES_FILE_DEFAULT,
    carregar_env,
    consultar_api_gupy,
)
from consola import configurar as configurar_consola
from consultas import gerar_consultas
from descricoes import DESCRICOES_FILE, descrever_vagas, salvar_descricoes

ARQUIVOS_HISTORICO = [VAGAS_RECENTES_FILE_DEFAULT, VAGAS_GERAIS_FILE_DEFAULT]
INTERVALO_ENTRE_CONSULTAS = 1


def main():
    configurar_consola()
    carregar_env()

    # 1. Vagas que ainda importam (o histórico guarda 7 dias).
    historico = []
    for arquivo in ARQUIVOS_HISTORICO:
        with open(arquivo, "r", encoding="utf-8") as f:
            historico += json.load(f)
    print(f"📋 {len(historico)} vaga(s) no histórico")

    # 2. Textos da API, por ID (reserva para quando a página não tem HTML).
    textos = {}
    for consulta in gerar_consultas():
        try:
            for vaga in consultar_api_gupy(consulta.url):
                textos.setdefault(str(vaga.get("id")), vaga.get("description", ""))
        except Exception as err:
            print(f"⚠️ Falhou [{consulta.rotulo}]: {err}")
        time.sleep(INTERVALO_ENTRE_CONSULTAS)
    print(f"🔎 {len(textos)} vaga(s) retornaram da API")

    # 3. Descrição de cada vaga, em paralelo: HTML da página primeiro, texto da
    #    API de reserva. São ~600 requisições independentes, então uma a uma
    #    levaria ~6 minutos; em lote, ~1 minuto.
    candidatos = []
    for vaga in historico:
        vaga_id = str(vaga.get("id"))
        candidatos.append({
            "id": vaga_id,
            "jobUrl": vaga.get("jobUrl", ""),
            "description": textos.get(vaga_id, ""),
        })

    print(f"🌐 Buscando o HTML de {len(candidatos)} vaga(s) em paralelo…")
    inicio = time.perf_counter()
    entradas = descrever_vagas(candidatos)
    print(f"   levou {time.perf_counter() - inicio:.0f}s")

    descricoes = {}
    por_fonte = {"html": 0, "texto": 0, "vazio": 0}
    for vaga_id, entrada in entradas.items():
        if entrada["secoes"]:
            descricoes[vaga_id] = entrada
            por_fonte[entrada["fonte"]] += 1
        else:
            por_fonte["vazio"] += 1

    salvar_descricoes(descricoes)

    # 4. Resumo
    print("=" * 60)
    print(f"✅ {len(descricoes)} vaga(s) com descrição em {DESCRICOES_FILE}")
    print(f"   ├── via HTML da página : {por_fonte['html']}")
    print(f"   └── via texto da API   : {por_fonte['texto']}")
    print(f"⚠️  {por_fonte['vazio']} vaga(s) sem a seção (o dashboard avisa e linka a vaga)")
    print("=" * 60)


if __name__ == "__main__":
    main()
