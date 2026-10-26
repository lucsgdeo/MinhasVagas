"""Leitores do LinkedIn, InfoJobs e Catho, sem rede.

    python -m unittest discover -s . -p 'test_fontes_externas.py' -v

Os trechos de HTML reproduzem a estrutura dos cartões de cada site (outubro
de 2026). Se um site mudar o layout, é aqui que o teste deve ser atualizado.
"""

import os
import sys
import unittest

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "monitor"))

import fontes_externas as f  # noqa: E402

INFOJOBS = """
<div id="vacancy12132713" data-modelversion="" data-id="12132713" class="pt-24 js_vacancyLoad"
     data-href="/vaga-de-tecnico-suporte-n1-em-sao-paulo__12132713.aspx">
  <div hidden class="js_date" data-value="2026/10/19 05:32:00"></div>
  <h2 class="h3 font-weight-bold text-body mb-2 js_vacancyTitle">
    T&#xE9;cnico De Suporte N1
  </h2>
  <a class="text-body text-decoration-none" href="https://www.infojobs.com.br/empresa-ti__-1.aspx">
    TECH <span class="text-nowrap">SERVICOS</span>
  </a>
  <div class="mb-8">
    Santo Andr&#xE9; - SP<span hidden>, 0 Km</span>
  </div>
</div>
<div id="vacancy99" data-modelversion="" data-id="99" class="pt-24 js_vacancyLoad" data-href="/vaga-99.aspx">
  <h2 class="h3 js_vacancyTitle">Auxiliar de Suporte</h2>
  <div class="mb-8">
    S&#xE3;o Jos&#xE9; dos Campos - SP
  </div>
</div>
"""

CATHO = """
<li data-offer-item="38847044" data-blind="false" class="mb-5">
 <article class="offer ">
 <span class="tag pub_ontem mb-2">Publicada em 15/10</span>
 <h2 class="title_offer">
 <a href="/vagas/analista-de-suporte-jr/38847044" title="Analista de Suporte Jr">Analista de Suporte Jr</a>
 </h2>
 <p class="mb-2"><span class="text-12">BRASNIPPON</span></p>
 <p><span class="icon i_job_location"></span><strong>1
vaga</strong>
 - S&#xE3;o Paulo
 </p>
 </article>
</li>
"""

LINKEDIN = """
<li>
  <div class="base-card job-search-card" data-entity-urn="urn:li:jobPosting:4012345678">
    <a class="base-card__full-link" href="https://br.linkedin.com/jobs/view/analista-suporte-n2-4012345678?position=1&amp;pageNum=0">
    </a>
    <h3 class="base-search-card__title">
      Analista de Suporte N2
    </h3>
    <h4 class="base-search-card__subtitle">
      <a href="#">Empresa de TI</a>
    </h4>
    <span class="job-search-card__location">
      São Bernardo do Campo, São Paulo, Brasil
    </span>
    <time class="job-search-card__listdate" datetime="2026-10-15">5 dias atrás</time>
  </div>
</li>
"""


class InfoJobs(unittest.TestCase):
    def test_le_o_cartao(self):
        vagas = f.ler_infojobs(INFOJOBS, "Suporte")
        self.assertEqual(len(vagas), 1, "São José dos Campos não está nas cidades aceitas")
        vaga = vagas[0]
        self.assertEqual(vaga["id"], "ij-12132713")
        self.assertEqual(vaga["name"], "Técnico De Suporte N1")
        self.assertEqual(vaga["careerPageName"], "TECH SERVICOS")
        self.assertEqual(vaga["city"], "Santo André")
        self.assertEqual(vaga["fonte"], "InfoJobs")
        self.assertEqual(vaga["publishedDate"], "2026-10-19T08:32:00.000Z")
        self.assertTrue(vaga["jobUrl"].endswith("__12132713.aspx"))


class Catho(unittest.TestCase):
    def test_le_o_cartao(self):
        vagas = f.ler_catho(CATHO, "Suporte", "Sao Paulo")
        self.assertEqual(len(vagas), 1)
        vaga = vagas[0]
        self.assertEqual(vaga["id"], "ca-38847044")
        self.assertEqual(vaga["name"], "Analista de Suporte Jr")
        self.assertEqual(vaga["careerPageName"], "BRASNIPPON")
        self.assertEqual(vaga["city"], "São Paulo")
        self.assertEqual(vaga["jobUrl"], "https://www.catho.com.br/vagas/analista-de-suporte-jr/38847044")
        self.assertIn("-10-15T", vaga["publishedDate"])


class LinkedIn(unittest.TestCase):
    def test_le_o_cartao(self):
        vagas = f.ler_linkedin(LINKEDIN, "Suporte")
        self.assertEqual(len(vagas), 1)
        vaga = vagas[0]
        self.assertEqual(vaga["id"], "li-4012345678")
        self.assertEqual(vaga["name"], "Analista de Suporte N2")
        self.assertEqual(vaga["careerPageName"], "Empresa de TI")
        self.assertEqual(vaga["city"], "São Bernardo do Campo")
        self.assertEqual(vaga["jobUrl"], "https://br.linkedin.com/jobs/view/analista-suporte-n2-4012345678")


class TituloRelevante(unittest.TestCase):
    """LinkedIn e Catho buscam na descrição; só entra quem cita suporte no título."""

    def test_descarta_vaga_que_so_cita_na_descricao(self):
        catho = CATHO.replace("Analista de Suporte Jr</a>", "Auxiliar de Crédito</a>")
        self.assertEqual(f.ler_catho(catho, "Suporte", "Sao Paulo"), [])

    def test_aceita_as_areas(self):
        for titulo in ("Técnico de Suporte", "Analista Help Desk", "Service Desk N1",
                       "Analista de TI N2", "Suporte Técnico Jr"):
            with self.subTest(titulo=titulo):
                self.assertTrue(f._titulo_relevante(titulo))


class Datas(unittest.TestCase):
    def test_dezembro_lido_em_janeiro_e_do_ano_anterior(self):
        from datetime import datetime
        agora = datetime(2027, 1, 5, tzinfo=f.FUSO_BR)
        self.assertEqual(f._data_dia_mes("28/12", agora).year, 2026)
        self.assertEqual(f._data_dia_mes("03/01", agora).year, 2027)


if __name__ == "__main__":
    unittest.main(verbosity=2)
