import { FonteBloqueadaError } from '../../aplicacao/portas';

const CABECALHOS = {
  'User-Agent':
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36',
  'Accept-Language': 'pt-BR,pt;q=0.9',
};
const TEMPO_LIMITE_MS = 30_000;
const MAX_TENTATIVAS = 3;
const ESPERA_ENTRE_TENTATIVAS_MS = 2000;

export type LeitorDePagina = (url: string, tempoLimiteMs?: number) => Promise<string>;

function statusDefinitivo(status: number): boolean {
  // Bloqueio ou URL errada não melhoram com nova tentativa; insistir só piora o bloqueio.
  return status >= 400 && status < 500 && status !== 408;
}

export const lerPagina: LeitorDePagina = async (url, tempoLimiteMs = TEMPO_LIMITE_MS) => {
  let ultimoErro: unknown;
  for (let tentativa = 1; tentativa <= MAX_TENTATIVAS; tentativa += 1) {
    try {
      const resposta = await fetch(url, {
        headers: CABECALHOS,
        signal: AbortSignal.timeout(tempoLimiteMs),
      });
      if (resposta.ok) return await resposta.text();
      if (resposta.status === 403 || resposta.status === 429) {
        throw new FonteBloqueadaError(`HTTP ${resposta.status}`, resposta.status === 429);
      }
      ultimoErro = new Error(`HTTP ${resposta.status}`);
      if (statusDefinitivo(resposta.status)) break;
    } catch (erro) {
      if (erro instanceof FonteBloqueadaError) throw erro;
      ultimoErro = erro;
    }
    if (tentativa < MAX_TENTATIVAS) {
      await new Promise((resolver) => setTimeout(resolver, ESPERA_ENTRE_TENTATIVAS_MS));
    }
  }
  throw ultimoErro;
};

/** "analista de sistemas" → "analista-de-sistemas", como as URLs dos sites esperam. */
export function termoEmSlug(termo: string): string {
  return termo
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-');
}
