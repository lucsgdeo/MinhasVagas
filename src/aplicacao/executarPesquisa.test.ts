import { describe, expect, it } from 'vitest';
import type { Consulta } from '../dominio/consulta';
import type { IdFonte, UltimaExecucao, Vaga } from '../dominio/vaga';
import { executarPesquisa, TodasAsFontesFalharamError } from './executarPesquisa';
import { FonteBloqueadaError, type FonteDeVagas, type RepositorioDeVagas, type VagaEncontrada } from './portas';

const AGORA = new Date('2026-11-01T12:00:00.000Z');
const CONSULTA: Consulta = { termo: 'dev', categoria: 'Desenvolvimento', remota: false };

function encontrada(sobrescrever: Partial<VagaEncontrada> = {}): VagaEncontrada {
  return {
    idOriginal: '1',
    titulo: 'Desenvolvedor Jr',
    empresa: 'ACME',
    url: 'https://exemplo.com/1',
    publicadaEm: '2026-11-01T10:00:00.000Z',
    remota: false,
    local: 'São Paulo',
    ...sobrescrever,
  };
}

function fonte(id: IdFonte, buscar: () => Promise<VagaEncontrada[]>): FonteDeVagas {
  return { id, permiteLerPaginaDaVaga: false, buscaPrecisa: true, consultas: () => [CONSULTA], buscar };
}

function repositorioEmMemoria(vagas: Vaga[] = [], vistas: Record<string, string> = {}) {
  const salvo: { vagas?: Vaga[]; vistas?: Record<string, string>; ultimaExecucao?: UltimaExecucao } = {};
  const repositorio: RepositorioDeVagas = {
    carregarVagas: async () => vagas,
    carregarVistas: async () => vistas,
    carregarDescricoes: async () => ({}),
    salvar: async (dados) => {
      Object.assign(salvo, dados);
    },
  };
  return { repositorio, salvo };
}

function rodar(fontes: FonteDeVagas[], repositorio: RepositorioDeVagas) {
  return executarPesquisa({
    fontes,
    repositorio,
    descritor: { descrever: async () => new Map() },
    registro: { info: () => {}, aviso: () => {} },
    espera: { aguardar: async () => {} },
    agora: () => AGORA,
  });
}

describe('executarPesquisa', () => {
  it('grava vaga nova com id prefixado pela fonte e a categoria da consulta', async () => {
    const { repositorio, salvo } = repositorioEmMemoria();
    await rodar([fonte('gupy', async () => [encontrada()])], repositorio);
    expect(salvo.vagas?.[0]).toMatchObject({ id: 'gupy-1', fonte: 'gupy', categoria: 'Desenvolvimento' });
  });

  it('remove vaga repetida entre sites, mantendo a primeira fonte', async () => {
    const { repositorio, salvo } = repositorioEmMemoria();
    await rodar(
      [fonte('gupy', async () => [encontrada()]), fonte('catho', async () => [encontrada({ idOriginal: '9' })])],
      repositorio,
    );
    expect(salvo.vagas?.map((vaga) => vaga.id)).toEqual(['gupy-1']);
  });

  it('descarta fora de tecnologia, cargo avançado, cidade fora da região e vaga antiga', async () => {
    const { repositorio, salvo } = repositorioEmMemoria();
    await rodar(
      [
        fonte('gupy', async () => [
          encontrada({ idOriginal: '1', titulo: 'Encanador de Infra' }),
          encontrada({ idOriginal: '2', titulo: 'Desenvolvedor Sênior' }),
          encontrada({ idOriginal: '3', local: 'Recife' }),
          encontrada({ idOriginal: '4', publicadaEm: '2026-10-01T00:00:00.000Z' }),
        ]),
      ],
      repositorio,
    );
    expect(salvo.vagas).toEqual([]);
  });

  it('usa o instante atual em vaga sem data e não a devolve depois que já foi vista', async () => {
    const primeira = repositorioEmMemoria();
    await rodar([fonte('remotar', async () => [encontrada({ publicadaEm: null })])], primeira.repositorio);
    expect(primeira.salvo.vagas?.[0]).toMatchObject({
      publicadaEm: AGORA.toISOString(),
      dataEstimada: true,
    });

    const segunda = repositorioEmMemoria([], primeira.salvo.vistas);
    await rodar([fonte('remotar', async () => [encontrada({ publicadaEm: null })])], segunda.repositorio);
    expect(segunda.salvo.vagas).toEqual([]);
  });

  it('isola a fonte que falha e registra o erro no resultado', async () => {
    const { repositorio, salvo } = repositorioEmMemoria();
    const resultados = await rodar(
      [
        fonte('linkedin', async () => {
          throw new Error('HTTP 429');
        }),
        fonte('gupy', async () => [encontrada()]),
      ],
      repositorio,
    );
    expect(resultados[0]).toMatchObject({ fonte: 'linkedin', consultasComErro: 1 });
    expect(salvo.vagas).toHaveLength(1);
  });

  describe('quando o site recusa o acesso', () => {
    const consultas = () => [CONSULTA, { ...CONSULTA, termo: 'qa' }, { ...CONSULTA, termo: 'ti' }];

    it('cancela as demais consultas em bloqueio definitivo, sem pausa', async () => {
      let chamadas = 0;
      const bloqueada: FonteDeVagas = {
        ...fonte('catho', async () => {
          chamadas += 1;
          throw new FonteBloqueadaError('HTTP 403', false);
        }),
        consultas,
      };
      const { repositorio } = repositorioEmMemoria();
      const resultados = await rodar([bloqueada, fonte('gupy', async () => [encontrada()])], repositorio);
      expect(chamadas).toBe(1);
      expect(resultados[0]).toMatchObject({ consultasComErro: 3, totalDeConsultas: 3 });
    });

    it('tenta de novo uma vez após o limite de requisições e segue se passar', async () => {
      let chamadas = 0;
      const limitada: FonteDeVagas = {
        ...fonte('linkedin', async () => {
          chamadas += 1;
          if (chamadas === 1) throw new FonteBloqueadaError('HTTP 429', true);
          return [];
        }),
        consultas,
      };
      const { repositorio } = repositorioEmMemoria();
      const resultados = await rodar([limitada], repositorio);
      expect(chamadas).toBe(4);
      expect(resultados[0]?.consultasComErro).toBe(0);
    });

    it('cancela se o limite continuar depois da pausa', async () => {
      let chamadas = 0;
      const limitada: FonteDeVagas = {
        ...fonte('linkedin', async () => {
          chamadas += 1;
          if (chamadas > 1) throw new FonteBloqueadaError('HTTP 429', true);
          return [encontrada()];
        }),
        consultas,
      };
      const { repositorio, salvo } = repositorioEmMemoria();
      const resultados = await rodar([limitada], repositorio);
      expect(chamadas).toBe(3);
      expect(resultados[0]?.consultasComErro).toBe(2);
      expect(salvo.vagas).toHaveLength(1);
    });
  });

  it('preserva os dados quando todas as fontes falham', async () => {
    const { repositorio, salvo } = repositorioEmMemoria();
    const quebrada = fonte('gupy', async () => {
      throw new Error('fora do ar');
    });
    await expect(rodar([quebrada], repositorio)).rejects.toBeInstanceOf(TodasAsFontesFalharamError);
    expect(salvo.vagas).toBeUndefined();
  });
});
