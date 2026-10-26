"""Testa os filtros de descarte (cargo e escopo de área) e o rótulo de nível.

    python3 -m unittest discover -s . -p 'test_filtros.py' -v

Os casos são títulos reais que apareceram no histórico (`data/`), não exemplos
inventados: a lista de áreas do filtro de escopo saiu deles, e um teste com
título inventado não pegaria o erro de digitação que a lista teve.
"""

import json
import os
import sys
import tempfile
import unittest

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "monitor"))

import common  # noqa: E402
import descricoes  # noqa: E402

PASTA_DADOS = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data")


class FiltroDeCargo(unittest.TestCase):
    """cargo_para_descartar: nível de cargo, no título."""

    def test_descarta_nivel_avancado(self):
        for titulo in (
            "Analista de Suporte Sênior",
            "Coordenador de Compras",
            "Supervisor de Operação",
            "Gerente de Loja",
            "Diretor de TI",
            "Especialista em Dados",
            "Desenvolvedor Pleno",
            "Analista de Dados PL",
        ):
            with self.subTest(titulo):
                self.assertTrue(descricoes.cargo_para_descartar(titulo))

    def test_mantem_nivel_de_entrada(self):
        for titulo in (
            "Analista de Suporte Jr",
            "Trainee de Suporte",
            "Aprendiz Administrativo",
            "Assistente de Suporte",
            "Auxiliar de Limpeza",
        ):
            with self.subTest(titulo):
                self.assertFalse(descricoes.cargo_para_descartar(titulo))

    def test_aceita_ambos_os_niveis(self):
        # A empresa admite entry level, então o cargo não é avançado.
        for titulo in ("Fullstack AI Engineer - (JR/PL)", "Advogado(a) Júnior/Pleno"):
            with self.subTest(titulo):
                self.assertFalse(descricoes.cargo_para_descartar(titulo))

    def test_pl_sql_nao_e_pleno(self):
        # "PL/SQL" é dialeto de banco, não nível de cargo.
        self.assertFalse(descricoes.cargo_para_descartar("Analista de Sistemas PL/SQL"))

    def test_area_de_coordenacao_nao_vira_cargo(self):
        # "Coordenação" aqui é onde a pessoa trabalha, não o que ela faz.
        for titulo in (
            "Assistente de Coordenação Pedagógica",
            "Auxiliar de Coordenação Infantil e fundamental I",
        ):
            with self.subTest(titulo):
                self.assertFalse(descricoes.cargo_para_descartar(titulo))

    def test_estagiario_no_feminino_e_entrada(self):
        # Regressão: `estagiario|estagio` não cobria "estagiária", e o feminino
        # entrava no corte de nível como se fosse "sênior".
        for titulo in ("Estagiária Sênior", "Estagiário Sênior", "Estagiaria Pleno"):
            with self.subTest(titulo):
                self.assertFalse(descricoes.cargo_para_descartar(titulo))

    def test_prefixo_pessoa_nao_quebra_o_cargo_de_entrada(self):
        # Regressão: a âncora `^` não casava depois de "Pessoa", e o cargo de
        # entrada era lido como se a pessoa fosse a下一代 responsável.
        for titulo in (
            "Pessoa Estagiária de Coordenação",
            "Pessoa Assistente de Coordenação",
            "Pessoa Auxiliar de Supervisão",
            "Pessoa Trainee de Gerência",
        ):
            with self.subTest(titulo):
                self.assertFalse(descricoes.cargo_para_descartar(titulo))

    def test_cargo_avancado_vence_prefixo_de_entrada(self):
        # O nível declarado manda mesmo em título de entrada.
        for titulo in ("Assistente Sr", "Operador de Produção Sênior", "Pessoa Assistente Sênior"):
            with self.subTest(titulo):
                self.assertTrue(descricoes.cargo_para_descartar(titulo))


class FiltroDeEscopo(unittest.TestCase):
    """estagio_fora_do_escopo: estágio de área que não é de tecnologia."""

    def test_descarta_estagio_de_area_nao_tech(self):
        for titulo in (
            "Estágio em Recursos Humanos | Gente e Gestão - SP",
            "Estágio em Jurídico",
            "Estágio de Pedagogia (TARDE)",
            "Pessoa Estagiária de Engenharia Civil – Obras | São Paulo - Zona Leste",
            "Estagiário(a) de Musculação - Seg a Sex 17h as 22h",
            "Estágio em SUPRIMENTOS (ADMINISTRAÇÃO, LOGÍSTICA) - ENOPS",
            "Estágio em FINANCEIRO (CIÊNCIAS CONTÁBEIS) - ENOPS",
            "Estágio - Compras e Não Revenda",
            "Estagiário de Remuneração e Benefícios",
            "ESTAGIARIO(A) DE OBRA - SANTO ANDRÉ",
        ):
            with self.subTest(titulo):
                self.assertTrue(descricoes.estagio_fora_do_escopo(titulo))

    def test_mantem_estagio_de_tecnologia(self):
        for titulo in (
            "Estágio em TI",
            "Estagiário(a) de TI - São Paulo",
            "ESTAGIÁRIO DE DESENVOLVIMENTO DE SOFTWARE - SÃO PAULO/SP",
            "Estágio em Desenvolvimento de Integrações | Consultoria em TI",
            "Estagiário(a) em Business Intelligence",
            "Estágio em Geoprocessamento 12571053M",
        ):
            with self.subTest(titulo):
                self.assertFalse(descricoes.estagio_fora_do_escopo(titulo))

    def test_tecnologia_no_titulo_vence_a_area(self):
        # Válvula de escape: "Suprimentos com SAP" é vaga de SAP, não de compras.
        # Descartar aqui seria o erro mais caro do filtro.
        for titulo in (
            "Estágio em Suprimentos com SAP",
            "Estagiário de Compras - SAP Business One",
            "Estágio em Jurídico com TI",
        ):
            with self.subTest(titulo):
                self.assertFalse(descricoes.estagio_fora_do_escopo(titulo))

    def test_administrativo_e_procurado(self):
        # Vaga de administrativo entra no escopo. A palavra NÃO está em
        # AREAS_FORA_DE_TECH de propósito.
        for titulo in (
            "ESTAGIARIO ADMINISTRATIVO | ITAIM BIBI, SP.",
            "Estagiária(o) em administração/Facilities",
            "Estagiário Administrativo de TI",
        ):
            with self.subTest(titulo):
                self.assertFalse(descricoes.estagio_fora_do_escopo(titulo))

    def test_administrativo_no_parente_ves_nao_salvou(self):
        # Regressão: "administração" aparece aqui só na lista de cursos
        # aceitos. A área de verdade vem antes do parêntese, e é por ela que a
        # vaga sai — se alguém reintroduzir o termo administrativo na lista,
        # estes quatro casos passam a depender da palavra errada.
        for titulo in (
            "Estágio em SUPRIMENTOS (ADMINISTRAÇÃO, LOGÍSTICA) - ENOPS",
            "Estágio em DEPARTAMENTO PESSOAL (ADMINISTRAÇÃO) - ENOPS",
            "Estágio em FINANCEIRO (ADMINISTRAÇÃO, ECONOMIA) - ENOPS",
            "Estágio em PRICING / COMÉRCIO EXTERIOR (COMÉRCIO EXTERIOR) - MSL",
        ):
            with self.subTest(titulo):
                self.assertTrue(descricoes.estagio_fora_do_escopo(titulo))

    def test_titulo_sem_area_fica(self):
        # O título não diz a área, e o filtro não adivinha: aparece para a
        # pessoa decidir, em vez de sumir sem ninguém ver.
        for titulo in ("Estagiário", "Estágio Universitário", "Programa de Estágio | Fast"):
            with self.subTest(titulo):
                self.assertFalse(descricoes.estagio_fora_do_escopo(titulo))

    def test_area_desconhecida_fica(self):
        # Uma área que ninguém catalogou passa. Errar para o lado de manter
        # custa um card; errar para o de descartar apaga a oportunidade.
        self.assertFalse(descricoes.estagio_fora_do_escopo("Estágio em Astrometria"))

    def test_nao_estagio_nao_entra_na_conta(self):
        # "Suporte" e "TI" são rótulos que o próprio filtro de cargo não pega
        # e que aqui não têm nada a ver: a área já vem do rótulo.
        for titulo in (
            "Analista de Suporte de Atendimento",
            "Analista de Tecnologia Júnior - Salesforce",
            "Técnico de Suporte JR - Noturno",
        ):
            with self.subTest(titulo):
                self.assertFalse(descricoes.estagio_fora_do_escopo(titulo))

    def test_aprendiz_tambem_e_estagio(self):
        self.assertTrue(descricoes.estagio_fora_do_escopo("Aprendiz de Jurídico"))


class FiltroDeSuporte(unittest.TestCase):
    """Escopo da aba "Suporte T.I.": tira suporte de vendas, acadêmico, call center."""

    def test_mantem_suporte_de_ti(self):
        for titulo in (
            "Técnico de Suporte  N1 -  Casa Verde",
            "Analista de Suporte N2",
            "Analista de TI Júnior (Suporte / Help Desk)",
            "Banco de Talentos - Operador de Suporte Técnico (Help Desk)",
            "Assistente de Suporte TI - Pessoa com Deficiência ",
            "Analista Suporte Redes Jr",
            "Analista de Suporte Técnico Júnior | Sucesso do Cliente",
            "ASSISTENTE DE ATENDIMENTO | SUPORTE TÉCNICO",
            "Analista de Suporte",
            "Técnico de Suporte - Nível 2 Presencial São Paulo ",
        ):
            with self.subTest(titulo=titulo):
                self.assertFalse(descricoes.suporte_fora_do_escopo(titulo))

    def test_descarta_suporte_fora_de_ti(self):
        for titulo in (
            "Suporte de Vendas | Mafra | São Paulo",
            "Analista de Suporte Comercial Júnior - Contrato Temporário",
            "Analista Suporte Acadêmico Jr. Temporário (Maple Bear - São Paulo/SP)",
            "Aprendiz em Suporte Logístico",
            "BANCO DE TALENTOS | SUPORTE DE USINAGEM",
            "Técnico de Suporte Industrial Jr.",
            "Assistente de Importação - Suporte ao cliente",
            "Operador de TeleAtendimento - Suporte ao Cliente Chat - São Paulo",
            "Estagiário de TI (Help Desk - Suporte) ",
        ):
            with self.subTest(titulo=titulo):
                self.assertTrue(descricoes.suporte_fora_do_escopo(titulo))


class CargoDeSuporte(unittest.TestCase):
    """cargo_suporte_para_descartar: N1/N2 pleno fica, sênior e gestão saem."""

    def test_n1_n2_pleno_fica(self):
        for titulo in (
            "12589234 - TÉCNICO DE SUPORTE N1 PLENO",
            "Analista de Suporte Pleno - N2",
            "Pessoa Técnica de Suporte N1 Pl. - Field ",
        ):
            with self.subTest(titulo=titulo):
                self.assertFalse(descricoes.cargo_suporte_para_descartar(titulo))

    def test_sem_nivel_segue_o_filtro_geral(self):
        self.assertTrue(descricoes.cargo_suporte_para_descartar("ANALISTA DE SUPORTE PLENO"))
        self.assertFalse(descricoes.cargo_suporte_para_descartar("Técnico de Suporte JR - Noturno"))

    def test_descarta_senior_gestao_e_n3(self):
        for titulo in (
            "Analista de Suporte N2 Sênior",
            "Team Leader de Suporte Service Desk | São Paulo ",
            "Coordenador de Suporte ",
            "Analista de Suporte N3",
        ):
            with self.subTest(titulo=titulo):
                self.assertTrue(descricoes.cargo_suporte_para_descartar(titulo))


class RotuloDeSuporte(unittest.TestCase):
    """rotulo_suporte: o nível vem do título."""

    def test_niveis(self):
        casos = {
            "Técnico de Suporte  N1 -  Casa Verde": "Suporte N1",
            "Técnico de Suporte 2º Nível - Presencial": "Suporte N2",
            "Analista de Suporte N1/N2": "Suporte N1/N2",
            "ANALISTA SUPORTE BILINGUE JR N1": "Suporte N1",
            "Analista de Suporte Júnior": "Suporte Jr",
            "Banco de Talentos - Operador de Suporte Técnico (Help Desk)": "Help Desk",
            "Analista de Suporte Técnico": "Suporte Técnico",
        }
        for titulo, esperado in casos.items():
            with self.subTest(titulo=titulo):
                self.assertEqual(descricoes.rotulo_suporte(titulo), esperado)

    def test_remoto_vira_sufixo(self):
        vaga = {"name": "Analista de Suporte N2", "workplaceType": "remote"}
        self.assertEqual(common.rotulo_da_vaga(vaga, "Suporte", "suporte"), "Suporte N2 Remoto")
        self.assertEqual(common.rotulo_da_vaga({"name": "X"}, "Redes Remoto", "geral"), "Redes Remoto")


class FiltroDeTIGeral(unittest.TestCase):
    """ti_geral_fora_do_escopo: só entra quem cita T.I. no título."""

    def test_mantem_ti(self):
        for titulo in ("Analista de Infraestrutura Jr", "Técnico de Redes", "Analista de TI", "Analista de NOC"):
            with self.subTest(titulo=titulo):
                self.assertFalse(descricoes.ti_geral_fora_do_escopo(titulo))

    def test_descarta_o_que_nao_e_ti(self):
        for titulo in (
            "Analista de Redes Sociais",
            "Engenheiro de Infraestrutura Civil",
            "Gerente de Rede de Lojas",
            "Assistente Administrativo",
            "Estágio em TI",
            # Títulos reais da primeira rodada (22/10/2026).
            "Auxiliar Construção Reparo Rede Gás I",
            "Analista de Infraestrutura Aeroportuária Júnior (Lado Ar)",
            "Executivo de Vendas III (TI, desenvolvimento, dados, infraestrutura)",
        ):
            with self.subTest(titulo=titulo):
                self.assertTrue(descricoes.ti_geral_fora_do_escopo(titulo))


class VagaParaDescartar(unittest.TestCase):
    """A função que junta os filtros, como o chamador os usa."""

    def test_motivo_do_escopo(self):
        vaga = {"name": "Suporte de Vendas | São Paulo"}
        self.assertEqual(common.vaga_para_descartar(vaga, destino="suporte"), "fora da área de T.I.")

    def test_motivo_do_cargo(self):
        vaga = {"name": "Analista de Suporte Sênior"}
        self.assertEqual(common.vaga_para_descartar(vaga, destino="suporte"), "cargo avançado")
        self.assertEqual(common.vaga_para_descartar({"name": "Analista de TI Pleno"}, destino="geral"), "cargo avançado")

    def test_titulo_ausente_nao_quebra(self):
        self.assertEqual(common.vaga_para_descartar({}, destino="suporte"), "")


class LimpezaDoHistorico(unittest.TestCase):
    """A limpeza roda numa pasta temporária: `salvar_vagas_recentes` escreve no disco."""

    def _limpar(self, vagas, destino):
        with tempfile.TemporaryDirectory() as pasta:
            historico = os.path.join(pasta, "historico.json")
            with open(historico, "w", encoding="utf-8") as f:
                json.dump(vagas, f, ensure_ascii=False)
            common.salvar_vagas_recentes([], "Teste", historico, destino=destino)
            with open(historico, encoding="utf-8") as f:
                return [v["name"] for v in json.load(f)]

    def test_suporte_guarda_14_dias(self):
        from datetime import datetime, timedelta, timezone
        ha_10_dias = (datetime.now(timezone.utc) - timedelta(days=10)).isoformat()
        vagas = [{"id": "1", "name": "Analista de Suporte N1 de TI", "publishedDate": ha_10_dias}]
        self.assertEqual(self._limpar(vagas, "suporte"), ["Analista de Suporte N1 de TI"])
        # Em "T.I. em Geral" a retenção é de 7 dias.
        self.assertEqual(self._limpar(vagas, "geral"), [])

    def test_limpeza_tira_suporte_de_vendas(self):
        from datetime import datetime, timezone
        agora = datetime.now(timezone.utc).isoformat()
        vagas = [
            {"id": "1", "name": "Técnico de Suporte JR", "publishedDate": agora},
            {"id": "2", "name": "Suporte de Vendas", "publishedDate": agora},
        ]
        self.assertEqual(self._limpar(vagas, "suporte"), ["Técnico de Suporte JR"])


if __name__ == "__main__":
    unittest.main(verbosity=2)
