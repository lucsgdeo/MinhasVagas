import type { Consulta } from '../dominio/consulta';
import type {
  Descricao,
  IdFonte,
  MapaDeDescricoes,
  UltimaExecucao,
  Vaga,
} from '../dominio/vaga';

/** O que uma fonte devolve antes de a pesquisa aplicar filtros e categoria. */
export interface VagaEncontrada {
  idOriginal: string;
  titulo: string;
  empresa: string;
  url: string;
  /** ISO 8601, ou `null` quando a fonte não informa a data. */
  publicadaEm: string | null;
  remota: boolean;
  local: string;
  descricaoHtml?: string;
  descricaoTexto?: string;
}

export interface FonteDeVagas {
  readonly id: IdFonte;
  /** False quando a página da vaga não pode ser lida para obter a descrição. */
  readonly permiteLerPaginaDaVaga: boolean;
  /** True quando a busca do site só traz títulos com o termo ou o site é só de tecnologia. */
  readonly buscaPrecisa: boolean;
  readonly intervaloEntreConsultasMs?: number;
  consultas(): Consulta[];
  buscar(consulta: Consulta): Promise<VagaEncontrada[]>;
}

export interface VagaParaDescrever {
  id: string;
  url: string;
  lerPagina: boolean;
  descricaoHtml?: string;
  descricaoTexto?: string;
}

export interface DescritorDeVagas {
  descrever(vagas: VagaParaDescrever[]): Promise<Map<string, Descricao>>;
}

/** Mapa id da vaga → instante ISO em que ela foi vista pela primeira vez. */
export type VagasVistas = Record<string, string>;

export interface RepositorioDeVagas {
  carregarVagas(): Promise<Vaga[]>;
  carregarVistas(): Promise<VagasVistas>;
  carregarDescricoes(): Promise<MapaDeDescricoes>;
  salvar(dados: {
    vagas: Vaga[];
    vistas: VagasVistas;
    descricoes: MapaDeDescricoes;
    ultimaExecucao: UltimaExecucao;
  }): Promise<void>;
}

export interface Registro {
  info(mensagem: string): void;
  aviso(mensagem: string): void;
}

export interface Espera {
  aguardar(milissegundos: number): Promise<void>;
}

/** Portas usadas pela interface web. */
export interface CatalogoDeVagas {
  listarVagas(): Promise<Vaga[]>;
  listarDescricoes(): Promise<MapaDeDescricoes>;
  ultimaExecucao(): Promise<UltimaExecucao | null>;
}
