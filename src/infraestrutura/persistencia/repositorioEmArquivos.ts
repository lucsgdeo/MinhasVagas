import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { RepositorioDeVagas } from '../../aplicacao/portas';

const ARQUIVOS = {
  vagas: 'vagas.json',
  vistas: 'vagas_vistas.json',
  descricoes: 'descricoes.json',
  ultimaExecucao: 'ultima_execucao.json',
};

async function lerJson<T>(caminho: string, padrao: T): Promise<T> {
  let conteudo: string;
  try {
    conteudo = await readFile(caminho, 'utf-8');
  } catch (erro) {
    if ((erro as NodeJS.ErrnoException).code === 'ENOENT') return padrao;
    throw erro;
  }
  // JSON corrompido deve interromper a pesquisa: tratá-lo como vazio apagaria o histórico.
  return JSON.parse(conteudo) as T;
}

export function criarRepositorioEmArquivos(pasta: string): RepositorioDeVagas {
  const caminho = (arquivo: string) => join(pasta, arquivo);
  const gravar = (arquivo: string, dados: unknown) =>
    writeFile(caminho(arquivo), `${JSON.stringify(dados, null, 2)}\n`, 'utf-8');

  return {
    carregarVagas: () => lerJson(caminho(ARQUIVOS.vagas), []),
    carregarVistas: () => lerJson(caminho(ARQUIVOS.vistas), {}),
    carregarDescricoes: () => lerJson(caminho(ARQUIVOS.descricoes), {}),
    async salvar({ vagas, vistas, descricoes, ultimaExecucao }) {
      await mkdir(pasta, { recursive: true });
      await Promise.all([
        gravar(ARQUIVOS.vagas, vagas),
        gravar(ARQUIVOS.vistas, vistas),
        gravar(ARQUIVOS.descricoes, descricoes),
        gravar(ARQUIVOS.ultimaExecucao, ultimaExecucao),
      ]);
    },
  };
}
