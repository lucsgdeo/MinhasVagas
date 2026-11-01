import { semAcento } from '../dominio/texto';
import type { Categoria, IdFonte, Vaga } from '../dominio/vaga';

export type SubAba = 'recentes' | 'nao-vistas' | 'todas';
export const TODAS = 'todas';

export interface JanelaDeTempo {
  inicio: number;
  fim: number;
}

export interface CriteriosDeFiltro {
  categoria: Categoria | typeof TODAS;
  fonte: IdFonte | typeof TODAS;
  busca: string;
  subAba: SubAba;
  /** Candidaturas no carregamento da página: marcar uma vaga não a tira da lista até recarregar. */
  vistasNoCarregamento: ReadonlySet<string>;
  janelaRecente: JanelaDeTempo;
}

/** Do início de ontem ao início de amanhã, no fuso local; `setDate` evita erros em troca de horário. */
export function calcularJanelaRecente(referencia: number): JanelaDeTempo {
  const inicioDoDia = (deslocamentoEmDias: number) => {
    const dia = new Date(referencia);
    dia.setHours(0, 0, 0, 0);
    dia.setDate(dia.getDate() + deslocamentoEmDias);
    return dia.getTime();
  };
  return { inicio: inicioDoDia(-1), fim: inicioDoDia(1) };
}

function maisRecentesPrimeiro(vagas: Vaga[]): Vaga[] {
  return [...vagas].sort((a, b) => Date.parse(b.publicadaEm) - Date.parse(a.publicadaEm));
}

export function filtrarVagas(vagas: Vaga[], criterios: CriteriosDeFiltro): Vaga[] {
  const { categoria, fonte, subAba, vistasNoCarregamento, janelaRecente } = criterios;
  const busca = semAcento(criterios.busca.trim());

  const candidatas = vagas.filter(
    (vaga) =>
      (categoria === TODAS || vaga.categoria === categoria) &&
      (fonte === TODAS || vaga.fonte === fonte) &&
      semAcento(vaga.titulo).includes(busca),
  );
  if (subAba === 'todas') return candidatas;

  const naoVistas = candidatas.filter((vaga) => !vistasNoCarregamento.has(vaga.id));
  if (subAba === 'nao-vistas') return naoVistas;

  return maisRecentesPrimeiro(
    naoVistas.filter((vaga) => {
      const publicadaEm = Date.parse(vaga.publicadaEm);
      return publicadaEm >= janelaRecente.inicio && publicadaEm < janelaRecente.fim;
    }),
  );
}

export function vagasPorHora(vagas: Vaga[]): number[] {
  const contagem = Array.from({ length: 24 }, () => 0);
  for (const vaga of vagas) {
    // Vaga sem data informada carrega a hora da pesquisa, o que distorceria o gráfico.
    if (vaga.dataEstimada) continue;
    const hora = new Date(vaga.publicadaEm).getHours();
    if (!Number.isNaN(hora)) contagem[hora] = (contagem[hora] ?? 0) + 1;
  }
  return contagem;
}
