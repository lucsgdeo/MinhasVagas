import { load } from 'cheerio';
import type { FonteDeVagas, VagaEncontrada } from '../../aplicacao/portas';
import { BUSCAS_GERAIS, consultasDaRegiao } from '../../dominio/consulta';
import type { Consulta } from '../../dominio/consulta';
import { textoIndicaRemoto } from '../../dominio/filtroDeVagas';
import { espacosNormalizados } from '../../dominio/texto';
import { termoEmSlug, type LeitorDePagina } from './clienteHttp';
import { dataHoraComBarrasParaIso } from './datas';

const ORIGEM = 'https://www.infojobs.com.br';

export function urlDaConsultaInfojobs(consulta: Consulta): string {
  return `${ORIGEM}/vagas-de-emprego-${termoEmSlug(consulta.termo)}-em-sao-paulo.aspx`;
}

export function interpretarInfojobs(html: string): VagaEncontrada[] {
  const $ = load(html);
  return $('.js_vacancyLoad[data-id]')
    .toArray()
    .map((elemento) => {
      const cartao = $(elemento);
      // Só o primeiro nó: a distância até o candidato vem em um elemento oculto ao lado.
      const local = espacosNormalizados(cartao.find('div.mb-8').first().contents().first().text());
      const modalidade = cartao.find('.icon-house-and-building').parent().text();
      const endereco = cartao.attr('data-href') ?? '';
      return {
        idOriginal: cartao.attr('data-id') ?? '',
        titulo: espacosNormalizados(cartao.find('.js_vacancyTitle').text()),
        empresa: espacosNormalizados(cartao.find('div.text-body').first().text()),
        url: endereco ? new URL(endereco, ORIGEM).href : '',
        publicadaEm: dataHoraComBarrasParaIso(cartao.find('.js_date').attr('data-value') ?? ''),
        remota: textoIndicaRemoto(modalidade),
        local,
      };
    });
}

export function criarFonteInfojobs(ler: LeitorDePagina): FonteDeVagas {
  return {
    id: 'infojobs',
    permiteLerPaginaDaVaga: true,
    buscaPrecisa: false,
    consultas: () => consultasDaRegiao(BUSCAS_GERAIS),
    buscar: async (consulta) => interpretarInfojobs(await ler(urlDaConsultaInfojobs(consulta))),
  };
}
