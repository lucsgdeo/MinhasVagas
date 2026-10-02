"""Teste do arquivo de auditoria de vagas descartadas, sem tocar em data/.

    uv run python -m unittest discover -s tests -p 'test_descartadas.py' -v
"""

import json
import os
import sys
import tempfile
import unittest

# `monitor/` é irmão de `tests/`, então precisa ser um nível acima.
sys.path.insert(
    0, os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "monitor")
)

import common  # noqa: E402


def vaga(vaga_id, nome, dias_atras=1):
    """Vaga publicada `dias_atras` atrás, em UTC."""
    from datetime import datetime, timedelta, timezone

    momento = datetime.now(timezone.utc) - timedelta(days=dias_atras)
    return {
        "id": vaga_id,
        "name": nome,
        "careerPageName": "Empresa Teste",
        "publishedDate": momento.isoformat().replace("+00:00", "Z"),
    }


class Descartadas(unittest.TestCase):
    def setUp(self):
        self.pasta = tempfile.TemporaryDirectory()
        self.arquivo = os.path.join(self.pasta.name, "vagas_descartadas.json")

    def tearDown(self):
        self.pasta.cleanup()

    def ler(self):
        with open(self.arquivo, encoding="utf-8") as f:
            return json.load(f)

    def test_grava_apenas_os_campos_de_auditoria(self):
        # Sem `description`: o pedido é guardar título e empresa, e puxar a
        # descrição das ~600 vagas seria uma requisição por vaga.
        common.salvar_descartadas([
            {**vaga("1", "Analista de Suporte Sênior"),
             "description": "texto longo que não deve ser gravado",
             "motivo": "cargo avançado", "topic": "Suporte", "jobUrl": "https://exemplo/1",
             "data_formatada_br": "01/10/2026 às 10:00", "workplaceType": "remote"},
        ], self.arquivo)

        salvo = self.ler()
        self.assertEqual(len(salvo), 1)
        self.assertEqual(salvo[0]["name"], "Analista de Suporte Sênior")
        self.assertEqual(salvo[0]["careerPageName"], "Empresa Teste")
        self.assertEqual(salvo[0]["motivo"], "cargo avançado")
        self.assertEqual(salvo[0]["jobUrl"], "https://exemplo/1")
        self.assertNotIn("description", salvo[0])

    def test_nao_duplica_na_segunda_rodada(self):
        # O cache evita reavaliar, e o arquivo também tem de ser idempotente:
        # rodar duas vezes não pode dobrar a lista.
        lote = [{**vaga("1", "A"), "motivo": "cargo avançado"}]
        common.salvar_descartadas(lote, self.arquivo)
        common.salvar_descartadas(lote, self.arquivo)
        self.assertEqual(len(self.ler()), 1)

    def test_poda_fora_da_janela_de_retencao(self):
        # Mesma retenção do histórico: passados 7 dias a vaga já saiu do
        # dashboard, então guardá-la aqui seria só lixo.
        common.salvar_descartadas(
            [{**vaga("1", "Recente"), "motivo": "cargo avançado"},
             {**vaga("2", "Antiga", dias_atras=30), "motivo": "cargo avançado"}],
            self.arquivo,
        )
        nomes = {v["name"] for v in self.ler()}
        self.assertIn("Recente", nomes)
        self.assertNotIn("Antiga", nomes)

    def test_rodada_sem_descarte_ainda_apara(self):
        # Passar lista vazia tem de reescrever o arquivo: é assim que a poda
        # acontece quando a rodada não achou nada novo.
        common.salvar_descartadas(
            [{**vaga("1", "Antiga", dias_atras=30), "motivo": "cargo avançado"}],
            self.arquivo,
        )
        common.salvar_descartadas([], self.arquivo)
        self.assertEqual(self.ler(), [])

    def test_ordena_da_mais_recente_para_mais_antiga(self):
        common.salvar_descartadas(
            [{**vaga("1", "Antigo", dias_atras=3), "motivo": "cargo avançado"},
             {**vaga("2", "Novo"), "motivo": "cargo avançado"}],
            self.arquivo,
        )
        self.assertEqual([v["name"] for v in self.ler()], ["Novo", "Antigo"])

    def test_arquivo_inexistente_vira_lista_vazia(self):
        self.assertEqual(common.carregar_descartadas(self.arquivo), [])


if __name__ == "__main__":
    unittest.main(verbosity=2)

