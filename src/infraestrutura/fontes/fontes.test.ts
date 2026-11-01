import { describe, expect, it } from 'vitest';
import type { Consulta } from '../../dominio/consulta';
import { interpretarCatho, urlDaConsultaCatho } from './catho';
import { termoEmSlug } from './clienteHttp';
import { dataBrasileiraParaIso, diaMesParaIso } from './datas';
import { interpretarGupy, urlDaConsultaGupy } from './gupy';
import { interpretarInfojobs } from './infojobs';
import { interpretarLinkedin, urlDaConsultaLinkedin } from './linkedin';
import { interpretarProgramathor } from './programathor';
import { interpretarRemotar } from './remotar';
import { interpretarVagasCom } from './vagasCom';

const AGORA = new Date('2026-11-01T12:00:00.000Z');
const PRESENCIAL: Consulta = { termo: 'help desk', categoria: 'Outras', remota: false };
const REMOTA: Consulta = { ...PRESENCIAL, remota: true };

describe('Gupy', () => {
  it('monta a URL por modalidade respeitando o limite da API', () => {
    const presencial = new URL(urlDaConsultaGupy(PRESENCIAL)).searchParams;
    expect(presencial.get('limit')).toBe('100');
    expect(presencial.get('city')).toContain('Diadema');
    expect(new URL(urlDaConsultaGupy(REMOTA)).searchParams.get('workplaceType')).toBe('remote');
  });

  it('interpreta a resposta', () => {
    const json = JSON.stringify({
      data: [{ id: 7, name: ' Dev ', careerPageName: 'ACME', jobUrl: 'https://a', publishedDate: '2026-10-30T20:36:27.492Z', workplaceType: 'remote' }],
    });
    expect(interpretarGupy(json, PRESENCIAL)[0]).toMatchObject({ idOriginal: '7', titulo: 'Dev', empresa: 'ACME', remota: true });
  });
});

describe('LinkedIn', () => {
  it('filtra remoto pelo Brasil e presencial por São Paulo', () => {
    expect(new URL(urlDaConsultaLinkedin(REMOTA)).searchParams.get('f_WT')).toBe('2');
    expect(new URL(urlDaConsultaLinkedin(PRESENCIAL)).searchParams.get('location')).toContain('São Paulo');
  });

  it('interpreta o cartão', () => {
    const html = `<li><div data-entity-urn="urn:li:jobPosting:44">
      <a class="base-card__full-link" href="https://br.linkedin.com/jobs/view/x-44?trk=y"></a>
      <h3 class="base-search-card__title"> Dev Jr </h3>
      <h4 class="base-search-card__subtitle"><a> ACME </a></h4>
      <span class="job-search-card__location"> São Paulo, Brazil </span>
      <time datetime="2026-10-29">Há 2 dias</time></div></li>`;
    expect(interpretarLinkedin(html, PRESENCIAL)).toEqual([
      {
        idOriginal: '44',
        titulo: 'Dev Jr',
        empresa: 'ACME',
        url: 'https://br.linkedin.com/jobs/view/x-44',
        publicadaEm: '2026-10-29',
        remota: false,
        local: 'São Paulo, Brazil',
      },
    ]);
  });
});

describe('InfoJobs', () => {
  it('interpreta o cartão', () => {
    const html = `<div data-id="12" class="js_vacancyLoad" data-href="/vaga-de-dev__12.aspx">
      <div class="js_date" data-value="2026/10/30 02:19:00"></div>
      <h2 class="js_vacancyTitle"> Dev Mobile </h2>
      <div class="text-body"><a href="https://www.infojobs.com.br/empresa-acme__1.aspx"> ACME </a></div>
      <div class="mb-8"> São Paulo - SP<span hidden>, 0 Km de você.</span></div>
      <div><svg class="icon-house-and-building"></svg> Híbrido</div></div>`;
    expect(interpretarInfojobs(html)[0]).toMatchObject({
      idOriginal: '12',
      titulo: 'Dev Mobile',
      empresa: 'ACME',
      url: 'https://www.infojobs.com.br/vaga-de-dev__12.aspx',
      publicadaEm: '2026-10-30T05:19:00.000Z',
      remota: false,
      local: 'São Paulo - SP',
    });
  });
});

describe('Catho', () => {
  it('monta a URL com o termo em forma de slug', () => {
    expect(urlDaConsultaCatho(PRESENCIAL)).toBe('https://www.catho.com.br/vagas/help-desk/sao-paulo-sp/');
  });

  it('interpreta o cartão', () => {
    const html = `<article class="offer"><span class="tag">Publicada em 29/10</span>
      <h2 class="title_offer"><a href="/vagas/dev-c/39046137">Dev C</a></h2>
      <p><span class="text-12">GOLDEN</span></p>
      <p><span class="icon i_job_location"></span><strong>1 vaga</strong> - Santo Andre</p></article>`;
    expect(interpretarCatho(html, AGORA)[0]).toMatchObject({
      idOriginal: '39046137',
      titulo: 'Dev C',
      empresa: 'GOLDEN',
      local: 'Santo Andre',
      url: 'https://www.catho.com.br/vagas/dev-c/39046137',
    });
  });
});

describe('Vagas.com', () => {
  it('interpreta o cartão e reconhece home office', () => {
    const html = `<li class="vaga"><h2 class="cargo">
      <a class="link-detalhes-vaga" data-id-vaga="28" title="Dev Jr" href="/vagas/v28/dev-jr"><mark>Dev</mark> Jr</a></h2>
      <span class="emprVaga"> HStern </span>
      <span class="vaga-local"> 100% Home Office <div hidden>A empresa também contrata em Recife</div></span>
      <span class="data-publicacao">14/10/2026</span></li>`;
    expect(interpretarVagasCom(html, AGORA)[0]).toMatchObject({
      idOriginal: '28',
      titulo: 'Dev Jr',
      empresa: 'HStern',
      remota: true,
      local: '100% Home Office',
      publicadaEm: '2026-10-14T15:00:00.000Z',
    });
  });
});

describe('Remotar', () => {
  it('ignora vagas inativas e marca as demais como remotas', () => {
    const json = JSON.stringify({
      data: [
        { id: 1, title: 'QA Jr', active: true, expired: false, externalLink: 'https://x', createdAt: '2026-10-31T21:26:06.238-03:00', company: { name: 'Insi' }, description: '<p>a</p>' },
        { id: 2, title: 'Antiga', active: false },
      ],
    });
    const vagas = interpretarRemotar(json);
    expect(vagas).toHaveLength(1);
    expect(vagas[0]).toMatchObject({ empresa: 'Insi', remota: true, descricaoHtml: '<p>a</p>' });
  });
});

describe('Programathor', () => {
  it('leva o nível para o título e não inventa data', () => {
    const html = `<div class="cell-list"><a href="/jobs/33-dev"><h3>Dev Mobile</h3>
      <div class="cell-list-content-icon"><span><i class="fa fa-briefcase"></i>ACME</span>
      <span><i class="fas fa-map-marker-alt"></i>Remoto</span>
      <span><i class="far fa-chart-bar"></i>Sênior</span></div></a></div>`;
    expect(interpretarProgramathor(html)[0]).toMatchObject({
      idOriginal: '33',
      titulo: 'Dev Mobile Sênior',
      empresa: 'ACME',
      remota: true,
      publicadaEm: null,
    });
  });
});

describe('datas e URLs', () => {
  it('converte termo em slug', () => {
    expect(termoEmSlug('Análise de Sistemas')).toBe('analise-de-sistemas');
  });

  it('entende datas brasileiras, hoje e ontem', () => {
    expect(dataBrasileiraParaIso('Hoje', AGORA)).toBe(AGORA.toISOString());
    expect(dataBrasileiraParaIso('Ontem', AGORA)).toBe('2026-10-31T12:00:00.000Z');
    expect(dataBrasileiraParaIso('sem data', AGORA)).toBeNull();
  });

  it('assume o ano anterior quando dia/mês cairia no futuro', () => {
    expect(diaMesParaIso('Publicada em 29/10', AGORA)).toBe('2026-10-29T15:00:00.000Z');
    expect(diaMesParaIso('Publicada em 25/12', AGORA)).toBe('2025-12-25T15:00:00.000Z');
  });
});
