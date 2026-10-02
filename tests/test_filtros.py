"""Testa os dois filtros de descarte: cargo avançado e escopo de área.

    uv run python -m unittest discover -s tests -p 'test_filtros.py' -v

Os casos são títulos reais que apareceram no histórico (`data/`), não exemplos
inventados: a lista de áreas do filtro de escopo saiu deles, e um teste com
título inventado não pegaria o erro de digitação que a lista teve.
"""

import json
import os
import sys
import tempfile
import unittest
from datetime import datetime, timedelta, timezone

# Este arquivo mora em `tests/`, então a raiz do projeto é um nível acima: são
# ela que precisam entrar no path, para `monitor/` e para `data/`.
RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(RAIZ, "monitor"))

import common  # noqa: E402
import descricoes  # noqa: E402
from common import FUSO_SP  # noqa: E402

PASTA_DADOS = os.path.join(RAIZ, "data")


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

    @staticmethod
    def vaga_de_exemplo(id_, nome, topic="Estágio"):
        """Vaga mínima no formato do histórico, com data dentro da janela.

        O teste precisa de uma data fresca de propósito: a limpeza apaga por
        cargo, por escopo **e** por idade, e uma vaga de oito dias sairia pelo
        motivo errado, sem provar nada sobre o filtro.
        """
        agora = datetime.now(FUSO_SP) - timedelta(hours=2)
        return {
            "id": id_,
            "name": nome,
            "topic": topic,
            "publishedDate": agora.astimezone(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.000Z"),
        }

    def test_a_limpeza_tira_as_sobras_do_tecnico(self):
        # A limpeza da próxima execução é o que apaga do histórico o que foi
        # gravado antes do filtro existir. O teste monta esse histórico ele
        # mesmo — com um resto de estágio de RH e um de cargo avançado ao lado
        # de duas vagas de tech legítimas — em vez de confiar no estado do
        # `data/`: assim ele não esvazia quando o CI roda o monitoramento.
        # Roda numa pasta temporária: `salvar_vagas_recentes` escreve no disco.
        fora_do_escopo = "Estágio em Recursos Humanos | Gente e Gestão - SP"
        cargo = "Analista de Dados PL"
        historico = [
            self.vaga_de_exemplo("1", fora_do_escopo),
            self.vaga_de_exemplo("2", cargo),
            self.vaga_de_exemplo("3", "Estágio em TI"),
            self.vaga_de_exemplo("4", "Analista de Suporte", topic="Suporte"),
        ]

        with tempfile.TemporaryDirectory() as pasta:
            arquivo = os.path.join(pasta, "vagas_recentes.json")
            with open(arquivo, "w", encoding="utf-8") as f:
                json.dump(historico, f, ensure_ascii=False)
            # Lista vazia = só a limpeza, que é o caminho de quem não achou
            # vaga nova nesta rodada.
            common.salvar_vagas_recentes([], "Estágio", arquivo, destino="tech")
            with open(arquivo, encoding="utf-8") as f:
                depois = json.load(f)

        self.assertEqual(
            sorted(v["name"] for v in depois),
            ["Analista de Suporte", "Estágio em TI"],
        )

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
        # mostrava estágio de RH, jurídico e pedagogia junto com o de TI. Os
        # títulos são reais (saíram do histórico), mas a lista é montada aqui
        # para o teste não depender do que o `data/` tem gravado hoje.
        estagios = [
            "Estágio em Recursos Humanos | Gente e Gestão - SP",
            "Estágio em Jurídico",
            "Estágio de Pedagogia (TARDE)",
            "Estágio em TI",
            "Estagiário(a) de TI - São Paulo",
        ]
        fora = [t for t in estagios if descricoes.estagio_fora_do_escopo(t)]
        dentro = [t for t in estagios if not descricoes.estagio_fora_do_escopo(t)]
        self.assertEqual(len(fora), 3, "o filtro tem de pegar RH, jurídico e pedagogia")
        self.assertEqual(len(dentro), 2, "o filtro não pode comer o estágio de TI")

    def test_a_aba_de_estagio_do_tech_nao_tem_areas_de_fora(self):
        # O mesmo filtro conferido contra o `data/` de verdade: o que a aba
        # mostra hoje não pode ter nenhum título de área fora de tech. Aqui a
        # lista vazia é o estado esperado, então o teste não esvazia.
        fora = [
            v["name"]
            for v in self.tech
            if v["topic"].startswith("Estágio") and descricoes.estagio_fora_do_escopo(v["name"])
        ]
        self.assertEqual(fora, [])


if __name__ == "__main__":
    unittest.main(verbosity=2)
