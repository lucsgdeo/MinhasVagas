"""Testa os dois filtros de descarte: cargo avançado e escopo de área.

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


class VagaParaDescartar(unittest.TestCase):
    """A função que junta os dois filtros, como o chamador os usa."""

    def test_motivo_do_cargo(self):
        vaga = {"name": "Analista de Suporte Sênior"}
        self.assertEqual(common.vaga_para_descartar(vaga, destino="tech"), "cargo avançado")

    def test_motivo_do_escopo(self):
        vaga = {"name": "Estágio em Jurídico"}
        self.assertEqual(
            common.vaga_para_descartar(vaga, destino="tech"),
            "estágio fora da área de tech",
        )

    def test_escopo_nao_roda_em_gerais(self):
        # Em "Vagas Gerais" estágio de RH é o que a aba procura.
        vaga = {"name": "Estágio em Jurídico"}
        self.assertEqual(common.vaga_para_descartar(vaga, destino="geral"), "")

    def test_cargo_roda_nos_dois_destinos(self):
        # Nível avançado está fora do escopo das duas abas.
        vaga = {"name": "Analista de Suporte Sênior"}
        self.assertEqual(common.vaga_para_descartar(vaga, destino="geral"), "cargo avançado")

    def test_vaga_valida_passa(self):
        self.assertEqual(common.vaga_para_descartar({"name": "Estágio em TI"}, destino="tech"), "")

    def test_titulo_ausente_nao_quebra(self):
        self.assertEqual(common.vaga_para_descartar({}, destino="tech"), "")


class HistoricoReal(unittest.TestCase):
    """Confere o filtro contra os arquivos que o dashboard serve hoje."""

    def setUp(self):
        with open(os.path.join(PASTA_DADOS, "vagas_recentes.json"), encoding="utf-8") as f:
            self.tech = json.load(f)
        with open(os.path.join(PASTA_DADOS, "vagas_gerais.json"), encoding="utf-8") as f:
            self.geral = json.load(f)

    def test_gerais_esta_limpo(self):
        sobras = [v["name"] for v in self.geral if common.vaga_para_descartar(v, destino="geral")]
        self.assertEqual(sobras, [])

    def test_a_limpeza_tira_as_sobras_do_tecnico(self):
        # O `data/` de hoje foi gravado antes do filtro de escopo existir, então
        # ainda tem estágio de RH dentro dele. O que interessa é a próxima
        # execução limpá-lo — é ela que apaga do histórico o que já está gravado.
        # Roda numa pasta temporária: `salvar_vagas_recentes` escreve no disco.
        antes = [v["name"] for v in self.tech if common.vaga_para_descartar(v, destino="tech")]
        self.assertGreater(len(antes), 0, "nada para limpar: o filtro já estaria aplicado")

        with tempfile.TemporaryDirectory() as pasta:
            historico = os.path.join(pasta, "vagas_recentes.json")
            with open(historico, "w", encoding="utf-8") as f:
                json.dump(self.tech, f, ensure_ascii=False)
            # Lista vazia = só a limpeza, que é o caminho de quem não achou
            # vaga nova nesta rodada.
            common.salvar_vagas_recentes([], "Estágio", historico, destino="tech")
            with open(historico, encoding="utf-8") as f:
                depois = json.load(f)

        nomes_depois = {v["name"] for v in depois}
        for nome in antes:
            self.assertNotIn(nome, nomes_depois)
        # E o que é de tech fica.
        for nome in ("Estágio em TI", "Estagiário(a) de TI - São Paulo"):
            if any(v["name"] == nome for v in self.tech):
                self.assertIn(nome, nomes_depois)

    def test_gerais_nao_perde_estagio_fora_do_escopo(self):
        # A pasta temporária acima tem nome de "vagas_recentes.json", mas o
        # destino é o que manda: com "geral", o estágio de RH tem de ficar.
        with tempfile.TemporaryDirectory() as pasta:
            historico = os.path.join(pasta, "vagas_recentes.json")
            alvo = {"id": "1", "name": "Estágio em Jurídico", "publishedDate": "2026-09-25T10:00:00Z"}
            with open(historico, "w", encoding="utf-8") as f:
                json.dump([alvo], f, ensure_ascii=False)
            common.salvar_vagas_recentes([], "Geral Presencial", historico, destino="geral")
            with open(historico, encoding="utf-8") as f:
                depois = json.load(f)
        self.assertEqual([v["name"] for v in depois], ["Estágio em Jurídico"])

    def test_o_escopo_muda_a_aba_de_estagio(self):
        # O motivo do filtro novo: sem ele, a aba "Estágio" da "Vagas Tech"
        # mostrava estágio de RH, jurídico e pedagogia junto com o de TI.
        estagios = [v for v in self.tech if v["topic"].startswith("Estágio")]
        fora = [v for v in estagios if descricoes.estagio_fora_do_escopo(v["name"])]
        dentro = [v for v in estagios if not descricoes.estagio_fora_do_escopo(v["name"])]
        self.assertGreater(len(fora), 0, "nenhum estágio fora do escopo: o filtro não age")
        self.assertGreater(len(dentro), 0, "o filtro comeu todos os estágios de tech")
        # O caso é concreto: o histórico tem estágio de RH e de TI ao mesmo tempo.
        self.assertTrue(any("recursos humanos" in v["name"].lower() for v in fora))
        self.assertTrue(any(v["name"].strip().endswith("em TI") for v in estagios))


if __name__ == "__main__":
    unittest.main(verbosity=2)
