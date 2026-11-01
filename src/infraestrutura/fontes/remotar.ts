import type { FonteDeVagas, VagaEncontrada } from '../../aplicacao/portas';
import { BUSCAS_GERAIS, consultasDaRegiao } from '../../dominio/consulta';
import type { Consulta } from '../../dominio/consulta';
import type { LeitorDePagina } from './clienteHttp';

const URL_DA_API = 'https://api.remotar.com.br/jobs';

interface VagaDaRemotar {
  id: number;
  title?: string;
  description?: string;
  type?: string;
  city?: string;
  state?: string;
  externalLink?: string | null;
  createdAt?: string;
  active?: boolean;
  expired?: boolean;
  company?: { name?: string } | null;
  companyDisplayName?: string | null;
}

export function urlDaConsultaRemotar(consulta: Consulta): string {
  return `${URL_DA_API}?${new URLSearchParams({ search: consulta.termo })}`;
}

export function interpretarRemotar(json: string): VagaEncontrada[] {
  const { data = [] } = JSON.parse(json) as { data?: VagaDaRemotar[] };
  return data
    .filter((vaga) => vaga.active !== false && !vaga.expired)
    .map((vaga) => ({
      idOriginal: String(vaga.id),
      titulo: vaga.title?.trim() ?? '',
      empresa: vaga.companyDisplayName ?? vaga.company?.name ?? '',
      url: vaga.externalLink ?? `https://remotar.com.br/job/${vaga.id}`,
      publicadaEm: vaga.createdAt ?? null,
      remota: true,
      local: '',
      descricaoHtml: vaga.description,
    }));
}

/** Site só de vagas remotas: a API já entrega a descrição em HTML. */
export function criarFonteRemotar(ler: LeitorDePagina): FonteDeVagas {
  return {
    id: 'remotar',
    permiteLerPaginaDaVaga: false,
    buscaPrecisa: false,
    consultas: () => consultasDaRegiao(BUSCAS_GERAIS),
    buscar: async (consulta) => interpretarRemotar(await ler(urlDaConsultaRemotar(consulta))),
  };
}
