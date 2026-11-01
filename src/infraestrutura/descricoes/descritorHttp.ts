import { load } from 'cheerio';
import type { DescritorDeVagas, Registro, VagaParaDescrever } from '../../aplicacao/portas';
import type { Descricao } from '../../dominio/vaga';
import type { LeitorDePagina } from '../fontes/clienteHttp';
import { extrairSecoesDoHtml, extrairSecoesDoTexto } from './extrairSecoes';

const TEMPO_LIMITE_DA_PAGINA_MS = 12_000;
const TRABALHADORES = 8;
const FALHAS_ANTES_DE_DESISTIR_DO_PORTAL = 2;
const TEM_MARCACAO = /<[a-z][^>]*>/i;

/** Procura a descrição no JSON-LD `JobPosting` da página: alguns sites usam HTML, outros texto puro. */
export function descricaoDoJsonLd(pagina: string): string | null {
  const $ = load(pagina);
  for (const script of $('script[type="application/ld+json"]').toArray()) {
    let dados: unknown;
    try {
      dados = JSON.parse($(script).text());
    } catch {
      continue;
    }
    for (const objeto of Array.isArray(dados) ? dados : [dados]) {
      const { '@type': tipo, description: descricao } = (objeto ?? {}) as Record<string, unknown>;
      if (String(tipo).includes('JobPosting') && typeof descricao === 'string' && descricao.trim()) {
        return descricao;
      }
    }
  }
  return null;
}

/** Prefere o HTML, que preserva títulos e listas; o texto achatado é só a reserva. */
export function criarDescritorHttp(ler: LeitorDePagina, registro: Registro): DescritorDeVagas {
  const falhasPorPortal = new Map<string, number>();

  async function descricaoDaPagina(url: string): Promise<string | null> {
    const portal = new URL(url).host;
    // Sem isso, um portal fora do ar custaria o tempo limite em todas as vagas dele.
    if ((falhasPorPortal.get(portal) ?? 0) >= FALHAS_ANTES_DE_DESISTIR_DO_PORTAL) return null;
    try {
      return descricaoDoJsonLd(await ler(url, TEMPO_LIMITE_DA_PAGINA_MS));
    } catch (erro) {
      const falhas = (falhasPorPortal.get(portal) ?? 0) + 1;
      falhasPorPortal.set(portal, falhas);
      if (falhas === FALHAS_ANTES_DE_DESISTIR_DO_PORTAL) {
        registro.aviso(`${portal} não respondeu (${String(erro)}); as próximas vagas dele ficam sem a página.`);
      }
      return null;
    }
  }

  async function descrever(vaga: VagaParaDescrever): Promise<Descricao> {
    const conteudo = vaga.descricaoHtml ?? (vaga.lerPagina ? await descricaoDaPagina(vaga.url) : null);
    const secoesDoHtml = conteudo && TEM_MARCACAO.test(conteudo) ? extrairSecoesDoHtml(conteudo) : [];
    if (secoesDoHtml.length > 0) return { fonte: 'html', secoes: secoesDoHtml };

    const textoDaPagina = conteudo && !TEM_MARCACAO.test(conteudo) ? conteudo : '';
    return { fonte: 'texto', secoes: extrairSecoesDoTexto(vaga.descricaoTexto || textoDaPagina) };
  }

  return {
    async descrever(vagas) {
      const resultado = new Map<string, Descricao>();
      const fila = [...vagas];
      const trabalhar = async () => {
        for (let vaga = fila.shift(); vaga; vaga = fila.shift()) {
          // A descrição é um complemento: um erro nela não pode custar as vagas da pesquisa inteira.
          try {
            resultado.set(vaga.id, await descrever(vaga));
          } catch (erro) {
            registro.aviso(`Descrição de ${vaga.id} (${vaga.url}) falhou: ${String(erro)}`);
          }
        }
      };
      await Promise.all(Array.from({ length: TRABALHADORES }, trabalhar));
      return resultado;
    },
  };
}
