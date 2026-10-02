"""Testa a conta de datas do guardião contra os cenários que importam.

    uv run python -m unittest discover -s tests -p 'test_guardiao.py' -v
"""

import datetime as dt
import os
import sys
import unittest

# `monitor/` é irmão de `tests/`, então precisa ser um nível acima.
sys.path.insert(
    0, os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "monitor")
)

import guardiao  # noqa: E402

UTC = dt.timezone.utc


def em(texto: str) -> dt.datetime:
    return dt.datetime.strptime(texto, "%Y-%m-%d %H:%M").replace(tzinfo=UTC)


class DataAlvo(unittest.TestCase):
    def test_cron_registra_o_proprio_dia(self):
        # O cron dispara às 21:30 com grace 0: precisa registrar o dia dele.
        for dia in ("2026-09-28", "2026-12-31", "2027-01-01"):
            with self.subTest(dia=dia):
                self.assertEqual(guardiao.data_alvo(0, em(f"{dia} 21:30")), dia)

    def test_guardiao_antes_do_cron_nao_avanca_o_dia(self):
        # A janela de 21:17 é a que roda 13 min antes do cron oficial. Se ela
        # avançasse o dia aqui, teríamos dois monitoramentos e dois pushes
        # brigando pelo mesmo commit.
        for hora in ("00:17", "09:17", "18:17", "21:17"):
            with self.subTest(hora=hora):
                self.assertEqual(guardiao.data_alvo(45, em(f"2026-09-28 {hora}")), "2026-09-27")

    def test_guardiao_depois_do_cron_avanca_o_dia(self):
        # Depois das 22:15 o disparo de 28/09 venceu de fato, então o alvo passa
        # a ser 28/09. É o que faz o guardião recuperar uma execução perdida.
        for hora in ("00:17", "03:17", "12:17", "21:17"):
            with self.subTest(hora=hora):
                self.assertEqual(guardiao.data_alvo(45, em(f"2026-09-29 {hora}")), "2026-09-28")

    def test_grace_de_45_seguros_a_borda(self):
        # 22:15 é exatamente 21:30 + 45. Antes disso, ainda não venceu.
        self.assertEqual(guardiao.data_alvo(45, em("2026-09-28 22:14")), "2026-09-27")
        self.assertEqual(guardiao.data_alvo(45, em("2026-09-28 22:15")), "2026-09-28")

    def test_vira_o_mes_e_o_ano(self):
        # Virada de mês/ano é onde código de data costuma quebrar.
        self.assertEqual(guardiao.data_alvo(45, em("2026-10-01 00:17")), "2026-09-30")
        self.assertEqual(guardiao.data_alvo(45, em("2027-01-01 03:17")), "2026-12-31")
        self.assertEqual(guardiao.data_alvo(0, em("2027-01-01 21:30")), "2027-01-01")

    def test_ano_bissexto(self):
        self.assertEqual(guardiao.data_alvo(45, em("2028-03-01 00:17")), "2028-02-29")


class DecisaoDoGuardiao(unittest.TestCase):
    """Regras de 'está atrasado', com a sentinel escrita em disco de verdade."""

    def setUp(self):
        self.diretorio = dt.datetime.now().strftime("/tmp/guardiao-test-%f")
        os.makedirs(self.diretorio, exist_ok=True)
        self.origem = guardiao.ARQUIVO_SENTINELA
        guardiao.ARQUIVO_SENTINELA = os.path.join(self.diretorio, "ultimo_monitoramento.json")

    def tearDown(self):
        guardiao.ARQUIVO_SENTINELA = self.origem

    def escrever(self, data):
        with open(guardiao.ARQUIVO_SENTINELA, "w", encoding="utf-8") as f:
            f.write('{"data": "%s"}' % data)

    def sentinel(self):
        return (guardiao.ler_sentinela() or {}).get("data")

    def test_sentinel_ausente_e_atraso(self):
        self.assertIsNone(self.sentinel())
        self.assertTrue(guardiao.esta_atrasado(None, "2026-09-28"))

    def test_escrever_depois_le_o_dia(self):
        self.escrever("2026-09-28")
        self.assertEqual(self.sentinel(), "2026-09-28")

    def test_cobre_o_dia_alvo_nao_e_atraso(self):
        self.escrever("2026-09-28")
        self.assertFalse(guardiao.esta_atrasado(self.sentinel(), "2026-09-28"))

    def test_um_dia_de_atraso_e_atraso(self):
        self.escrever("2026-09-26")
        self.assertTrue(guardiao.esta_atrasado(self.sentinel(), "2026-09-28"))

    def test_correndo_a_direita_continua_atraso(self):
        # Um dia de atraso ainda está atrasado: o guardião roda uma vez, escreve
        # o dia de hoje e pronto. Não é assim que ele "pega" o dia perdido.
        self.escrever("2026-09-27")
        self.assertTrue(guardiao.esta_atrasado(self.sentinel(), "2026-09-28"))

    def test_sentinel_corrompida_vira_ausente(self):
        # O pior caso de uma sentinela ilegível é um monitoramento a mais, que
        # é barato. O alternativo seria o guardião achar que está tudo certo.
        with open(guardiao.ARQUIVO_SENTINELA, "w", encoding="utf-8") as f:
            f.write("{isto nao e json")
        self.assertIsNone(self.sentinel())
        self.assertTrue(guardiao.esta_atrasado(self.sentinel(), "2026-09-28"))

    def test_sentinel_no_futuro_nao_e_atraso(self):
        # Relógio adiantado ou sentinel de uma máquina com data trocada: não
        # conta como atraso, senão o guardião refaz trabalho o dia inteiro.
        self.escrever("2026-09-29")
        self.assertFalse(guardiao.esta_atrasado(self.sentinel(), "2026-09-28"))


class SentinelPreservada(unittest.TestCase):
    """--se-vencido: o guardião não pode apagar a prova do cron numa corrida."""

    def setUp(self):
        self.origem = guardiao.ARQUIVO_SENTINELA
        self.arquivo = "/tmp/guardiao-preservada.json"
        guardiao.ARQUIVO_SENTINELA = self.arquivo
        if os.path.exists(self.arquivo):
            os.remove(self.arquivo)

    def tearDown(self):
        guardiao.ARQUIVO_SENTINELA = self.origem
        if os.path.exists(self.arquivo):
            os.remove(self.arquivo)

    def escrever(self, data, origem):
        with open(self.arquivo, "w", encoding="utf-8") as f:
            f.write('{"data": "%s", "origem": "%s"}' % (data, origem))

    def ler(self):
        import json
        with open(self.arquivo, encoding="utf-8") as f:
            return json.load(f)

    def registrar_com_se_vencido(self, origem, grace):
        import contextlib
        import io
        import sys
        argv = sys.argv
        sys.argv = ["guardiao.py", "escrever", "--origem", origem,
                    "--grace", str(grace), "--se-vencido"]
        # main() imprime no caminho "já estava coberto"; engolir mantém a saída
        # dos testes limpa sem precisar silenciar o script.
        try:
            with contextlib.redirect_stdout(io.StringIO()):
                return guardiao.main()
        finally:
            sys.argv = argv

    def test_nao_sobrescreve_quando_ja_coberto(self):
        hoje = guardiao.data_alvo(0)
        self.escrever(hoje, "cron")
        self.registrar_com_se_vencido("guardiao", 45)
        self.assertEqual(self.ler()["origem"], "cron")

    def test_grava_quando_realmente_atrasado(self):
        self.escrever("2020-01-01", "cron")
        self.registrar_com_se_vencido("guardiao", 45)
        self.assertEqual(self.ler()["origem"], "guardiao")

    def test_cron_sem_a_flag_sempre_grava(self):
        # O cron precisa sobrescrever de propósito: é ele que define o dia, mesmo
        # que o guardião já tenha registrado mais cedo.
        hoje = guardiao.data_alvo(0)
        self.escrever(hoje, "guardiao")
        import sys
        argv = sys.argv
        sys.argv = ["guardiao.py", "escrever", "--origem", "cron", "--grace", "0"]
        try:
            guardiao.main()
        finally:
            sys.argv = argv
        self.assertEqual(self.ler()["origem"], "cron")


class Idempotencia(unittest.TestCase):
    def setUp(self):
        self.origem = guardiao.ARQUIVO_SENTINELA
        self.arquivo = "/tmp/guardiao-idem.json"
        guardiao.ARQUIVO_SENTINELA = self.arquivo
        if os.path.exists(self.arquivo):
            os.remove(self.arquivo)

    def tearDown(self):
        guardiao.ARQUIVO_SENTINELA = self.origem
        if os.path.exists(self.arquivo):
            os.remove(self.arquivo)

    def test_registrar_grava_origem_e_run_id(self):
        os.environ["GITHUB_RUN_ID"] = "12345"
        try:
            data = guardiao.registrar("guardiao", 45)
        finally:
            os.environ.pop("GITHUB_RUN_ID", None)
        import json
        with open(self.arquivo, encoding="utf-8") as f:
            reg = json.load(f)
        self.assertEqual(reg["origem"], "guardiao")
        self.assertEqual(reg["run_id"], "12345")
        self.assertEqual(reg["data"], data)

    def test_registrar_sobrescreve_sem_duplicar(self):
        for origem in ("cron", "guardiao", "cron"):
            guardiao.registrar(origem, 45)
        import json
        with open(self.arquivo, encoding="utf-8") as f:
            self.assertEqual(len(json.load(f)), 5)  # data, hora_utc, hora_br, origem, run_id


if __name__ == "__main__":
    unittest.main(verbosity=2)
