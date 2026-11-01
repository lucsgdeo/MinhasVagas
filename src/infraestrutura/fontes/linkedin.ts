import { load } from 'cheerio';
import type { FonteDeVagas, VagaEncontrada } from '../../aplicacao/portas';
import { BUSCAS_GERAIS, consultasPresenciaisERemotas } from '../../dominio/consulta';
import type { Consulta } from '../../dominio/consulta';
import { espacosNormalizados } from '../../dominio/texto';
import type { LeitorDePagina } from './clienteHttp';

const URL_DE_BUSCA = 'https://www.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search';
const ID_DO_BRASIL = '106057199';
const SETE_DIAS = 'r604800';
const MODALIDADE_REMOTA = '2';
// Estágio, assistente e júnior: a busca devolve só 10 itens, e sênior seria descartado depois.
const NIVEIS_DE_ENTRADA = '1,2,3';
// Com 1 s e com 6 s entre consultas, o site ainda respondeu HTTP 429 em parte das buscas.
const INTERVALO_PARA_EVITAR_BLOQUEIO_MS = 10_000;

export function urlDaConsultaLinkedin(consulta: Consulta): string {
  const parametros = new URLSearchParams({
    keywords: consulta.termo,
    f_TPR: SETE_DIAS,
    f_E: NIVEIS_DE_ENTRADA,
    start: '0',
    ...(consulta.remota
      ? { geoId: ID_DO_BRASIL, f_WT: MODALIDADE_REMOTA }
      : { location: 'São Paulo, São Paulo, Brazil' }),
  });
  return `${URL_DE_BUSCA}?${parametros}`;
}

export function interpretarLinkedin(html: string, consulta: Consulta): VagaEncontrada[] {
  const $ = load(html);
  return $('[data-entity-urn]')
    .toArray()
    .map((elemento) => {
      const cartao = $(elemento);
      const url = cartao.find('a.base-card__full-link').attr('href') ?? '';
      return {
        idOriginal: (cartao.attr('data-entity-urn') ?? '').split(':').pop() ?? '',
        titulo: espacosNormalizados(cartao.find('.base-search-card__title').text()),
        empresa: espacosNormalizados(cartao.find('.base-search-card__subtitle').text()),
        url: url.split('?')[0] ?? '',
        publicadaEm: cartao.find('time').attr('datetime') ?? null,
        remota: consulta.remota,
        local: espacosNormalizados(cartao.find('.job-search-card__location').text()),
      };
    })
    .filter((vaga) => vaga.idOriginal);
}

/** O robots.txt do LinkedIn proíbe este acesso; para desligar, remova a fonte em `fontes/index.ts`. */
export function criarFonteLinkedin(ler: LeitorDePagina): FonteDeVagas {
  return {
    id: 'linkedin',
    permiteLerPaginaDaVaga: false,
    buscaPrecisa: false,
    intervaloEntreConsultasMs: INTERVALO_PARA_EVITAR_BLOQUEIO_MS,
    consultas: () => consultasPresenciaisERemotas(BUSCAS_GERAIS),
    buscar: async (consulta) => interpretarLinkedin(await ler(urlDaConsultaLinkedin(consulta)), consulta),
  };
}
