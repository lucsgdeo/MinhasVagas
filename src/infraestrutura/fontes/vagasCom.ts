import { load } from 'cheerio';
import type { FonteDeVagas, VagaEncontrada } from '../../aplicacao/portas';
import { BUSCAS_GERAIS, consultasDaRegiao } from '../../dominio/consulta';
import type { Consulta } from '../../dominio/consulta';
import { textoIndicaRemoto } from '../../dominio/filtroDeVagas';
import { espacosNormalizados } from '../../dominio/texto';
import { termoEmSlug, type LeitorDePagina } from './clienteHttp';
import { dataBrasileiraParaIso } from './datas';

const ORIGEM = 'https://www.vagas.com.br';

export function urlDaConsultaVagasCom(consulta: Consulta): string {
  return `${ORIGEM}/vagas-de-${termoEmSlug(consulta.termo)}-em-sao-paulo`;
}

export function interpretarVagasCom(html: string, agora: Date): VagaEncontrada[] {
  const $ = load(html);
  return $('li.vaga')
    .toArray()
    .map((elemento) => {
      const cartao = $(elemento);
      const link = cartao.find('a.link-detalhes-vaga');
      // Só os nós de texto diretos: o elemento também guarda uma lista oculta de outras cidades.
      const local = espacosNormalizados(
        cartao.find('.vaga-local').contents().filter((_, no) => no.type === 'text').text(),
      );
      return {
        idOriginal: link.attr('data-id-vaga') ?? '',
        titulo: espacosNormalizados(link.attr('title') ?? link.text()),
        empresa: espacosNormalizados(cartao.find('.emprVaga').text()),
        url: new URL(link.attr('href') ?? '', ORIGEM).href,
        publicadaEm: dataBrasileiraParaIso(cartao.find('.data-publicacao').text(), agora),
        remota: textoIndicaRemoto(local),
        local,
      };
    })
    .filter((vaga) => vaga.idOriginal);
}

export function criarFonteVagasCom(ler: LeitorDePagina, agora: () => Date): FonteDeVagas {
  return {
    id: 'vagascom',
    permiteLerPaginaDaVaga: true,
    buscaPrecisa: false,
    consultas: () => consultasDaRegiao(BUSCAS_GERAIS),
    buscar: async (consulta) => interpretarVagasCom(await ler(urlDaConsultaVagasCom(consulta)), agora()),
  };
}
