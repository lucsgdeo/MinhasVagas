import { describe, expect, it } from 'vitest';
import type { Vaga } from '../dominio/vaga';
import { calcularJanelaRecente, filtrarVagas, vagasPorHora, type CriteriosDeFiltro } from './filtrarVagas';

const HOJE = new Date(2026, 10, 1, 12).getTime();

function vaga(id: string, sobrescrever: Partial<Vaga> = {}): Vaga {
  return {
    id,
    fonte: 'gupy',
    titulo: 'Desenvolvedor Jr',
    empresa: 'ACME',
    url: 'https://a',
    publicadaEm: new Date(HOJE).toISOString(),
    categoria: 'Desenvolvimento',
    remota: false,
    local: '',
    ...sobrescrever,
  };
}

const CRITERIOS: CriteriosDeFiltro = {
  categoria: 'todas',
  fonte: 'todas',
  busca: '',
  subAba: 'todas',
  vistasNoCarregamento: new Set(),
  janelaRecente: calcularJanelaRecente(HOJE),
};

const ids = (vagas: Vaga[]) => vagas.map(({ id }) => id);

describe('filtrarVagas', () => {
  it('filtra por categoria e por fonte', () => {
    const vagas = [vaga('a'), vaga('b', { categoria: 'TI' }), vaga('c', { fonte: 'catho' })];
    expect(ids(filtrarVagas(vagas, { ...CRITERIOS, categoria: 'TI' }))).toEqual(['b']);
    expect(ids(filtrarVagas(vagas, { ...CRITERIOS, fonte: 'catho' }))).toEqual(['c']);
  });

  it('busca no título ignorando acento e caixa', () => {
    const vagas = [vaga('a', { titulo: 'Estágio em TI' }), vaga('b')];
    expect(ids(filtrarVagas(vagas, { ...CRITERIOS, busca: 'ESTAGIO' }))).toEqual(['a']);
  });

  it('"não vistas" usa o instantâneo do carregamento', () => {
    const vagas = [vaga('a'), vaga('b')];
    const criterios = { ...CRITERIOS, subAba: 'nao-vistas' as const, vistasNoCarregamento: new Set(['a']) };
    expect(ids(filtrarVagas(vagas, criterios))).toEqual(['b']);
  });

  it('"recentes" fica em hoje e ontem, da mais nova para a mais antiga', () => {
    const vagas = [
      vaga('anteontem', { publicadaEm: new Date(2026, 9, 30, 23).toISOString() }),
      vaga('ontem', { publicadaEm: new Date(2026, 9, 31, 0, 1).toISOString() }),
      vaga('hoje'),
    ];
    expect(ids(filtrarVagas(vagas, { ...CRITERIOS, subAba: 'recentes' }))).toEqual(['hoje', 'ontem']);
  });
});

describe('vagasPorHora', () => {
  it('conta por hora local e ignora data estimada', () => {
    const contagem = vagasPorHora([
      vaga('a', { publicadaEm: new Date(2026, 10, 1, 9).toISOString() }),
      vaga('b', { publicadaEm: new Date(2026, 10, 1, 9).toISOString(), dataEstimada: true }),
    ]);
    expect(contagem[9]).toBe(1);
  });
});
