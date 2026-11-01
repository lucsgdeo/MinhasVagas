import type { CatalogoDeVagas } from '../../aplicacao/portas';
import type { MapaDeDescricoes, UltimaExecucao, Vaga } from '../../dominio/vaga';

async function lerJson<T>(caminho: string): Promise<T> {
  const resposta = await fetch(caminho, { cache: 'no-cache' });
  if (!resposta.ok) throw new Error(`HTTP ${resposta.status}`);
  return (await resposta.json()) as T;
}

export const catalogoHttp: CatalogoDeVagas = {
  listarVagas: () => lerJson<Vaga[]>('data/vagas.json'),
  listarDescricoes: () => lerJson<MapaDeDescricoes>('data/descricoes.json'),
  ultimaExecucao: () => lerJson<UltimaExecucao>('data/ultima_execucao.json').catch(() => null),
};
