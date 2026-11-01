import { load } from 'cheerio';
import type { FonteDeVagas, VagaEncontrada } from '../../aplicacao/portas';
import { textoIndicaRemoto } from '../../dominio/filtroDeVagas';
import { espacosNormalizados } from '../../dominio/texto';
import type { LeitorDePagina } from './clienteHttp';

const ORIGEM = 'https://programathor.com.br';
const NIVEL_AVANCADO = /^(?:s[eê]nior|pleno|especialista)$/i;

/**
 * O nível fica fora do título, em um ícone próprio. Ele é acrescentado ao título
 * quando é avançado para que o filtro de cargo do domínio decida, como nas demais fontes.
 * A lista não informa a data de publicação (`publicadaEm` nulo).
 */
export function interpretarProgramathor(html: string): VagaEncontrada[] {
  const $ = load(html);
  return $('.cell-list > a[href^="/jobs/"]')
    .toArray()
    .flatMap((elemento) => {
      const cartao = $(elemento);
      const endereco = cartao.attr('href') ?? '';
      const idOriginal = endereco.match(/^\/jobs\/(\d+)/)?.[1];
      if (!idOriginal) return [];

      const iconeDe = (classe: string) =>
        espacosNormalizados(cartao.find(`.cell-list-content-icon i.${classe}`).parent().text());
      const titulo = espacosNormalizados(cartao.find('h3').text());
      const nivel = iconeDe('fa-chart-bar');
      const local = iconeDe('fa-map-marker-alt');
      return [
        {
          idOriginal,
          titulo: NIVEL_AVANCADO.test(nivel) ? `${titulo} ${nivel}` : titulo,
          empresa: iconeDe('fa-briefcase'),
          url: new URL(endereco, ORIGEM).href,
          publicadaEm: null,
          remota: textoIndicaRemoto(local),
          local,
        },
      ];
    });
}

/** A busca do site não filtra por termo: a primeira página já lista as vagas mais novas. */
export function criarFonteProgramathor(ler: LeitorDePagina): FonteDeVagas {
  return {
    id: 'programathor',
    permiteLerPaginaDaVaga: true,
    buscaPrecisa: true,
    consultas: () => [{ termo: 'todas', categoria: 'Desenvolvimento', remota: false }],
    buscar: async () => interpretarProgramathor(await ler(`${ORIGEM}/jobs`)),
  };
}
