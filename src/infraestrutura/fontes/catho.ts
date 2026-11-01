import { load } from 'cheerio';
import type { FonteDeVagas, VagaEncontrada } from '../../aplicacao/portas';
import { BUSCAS_GERAIS, consultasDaRegiao } from '../../dominio/consulta';
import type { Consulta } from '../../dominio/consulta';
import { textoIndicaRemoto } from '../../dominio/filtroDeVagas';
import { espacosNormalizados } from '../../dominio/texto';
import { termoEmSlug, type LeitorDePagina } from './clienteHttp';
import { diaMesParaIso } from './datas';

const ORIGEM = 'https://www.catho.com.br';

export function urlDaConsultaCatho(consulta: Consulta): string {
  return `${ORIGEM}/vagas/${termoEmSlug(consulta.termo)}/sao-paulo-sp/`;
}

export function interpretarCatho(html: string, agora: Date): VagaEncontrada[] {
  const $ = load(html);
  return $('article.offer')
    .toArray()
    .flatMap((elemento) => {
      const cartao = $(elemento);
      const link = cartao.find('.title_offer a');
      const endereco = link.attr('href') ?? '';
      const idOriginal = endereco.match(/\/(\d+)\/?$/)?.[1];
      if (!idOriginal) return [];

      const localComQuantidade = espacosNormalizados(cartao.find('.i_job_location').parent().text());
      const local = localComQuantidade.split(' - ').slice(1).join(' - ');
      return [
        {
          idOriginal,
          titulo: espacosNormalizados(link.text()),
          empresa: espacosNormalizados(cartao.find('.text-12').first().text()),
          url: new URL(endereco, ORIGEM).href,
          publicadaEm: diaMesParaIso(cartao.find('.tag').first().text(), agora),
          remota: textoIndicaRemoto(localComQuantidade),
          local,
        },
      ];
    });
}

export function criarFonteCatho(ler: LeitorDePagina, agora: () => Date): FonteDeVagas {
  return {
    id: 'catho',
    permiteLerPaginaDaVaga: true,
    buscaPrecisa: false,
    consultas: () => consultasDaRegiao(BUSCAS_GERAIS),
    buscar: async (consulta) => interpretarCatho(await ler(urlDaConsultaCatho(consulta)), agora()),
  };
}
