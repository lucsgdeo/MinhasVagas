export const CATEGORIAS = ['Suporte', 'Estágio', 'Desenvolvimento', 'TI', 'Outras'] as const;
export type Categoria = (typeof CATEGORIAS)[number];

export type IdFonte =
  | 'gupy'
  | 'linkedin'
  | 'infojobs'
  | 'catho'
  | 'vagascom'
  | 'remotar'
  | 'programathor';

export const NOMES_DAS_FONTES: Record<IdFonte, string> = {
  gupy: 'Gupy',
  linkedin: 'LinkedIn',
  infojobs: 'InfoJobs',
  catho: 'Catho',
  vagascom: 'Vagas.com',
  remotar: 'Remotar',
  programathor: 'Programathor',
};

export interface Vaga {
  id: string;
  fonte: IdFonte;
  titulo: string;
  empresa: string;
  url: string;
  publicadaEm: string;
  /** A fonte não informa a data: `publicadaEm` é quando a vaga foi vista pela primeira vez. */
  dataEstimada?: boolean;
  categoria: Categoria;
  remota: boolean;
  local: string;
}

export type TipoDeBloco = 'item' | 'subtitulo' | 'texto';

export interface BlocoDeDescricao {
  tipo: TipoDeBloco;
  texto: string;
}

export interface SecaoDeDescricao {
  titulo: string;
  blocos: BlocoDeDescricao[];
}

export interface Descricao {
  fonte: 'html' | 'texto';
  secoes: SecaoDeDescricao[];
}

export type MapaDeDescricoes = Record<string, Descricao>;

export interface ResultadoDaFonte {
  fonte: IdFonte;
  encontradas: number;
  novas: number;
  consultasComErro: number;
  totalDeConsultas: number;
}

export interface UltimaExecucao {
  executadaEm: string;
  resultados: ResultadoDaFonte[];
}
