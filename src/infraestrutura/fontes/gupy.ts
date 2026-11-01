import type { FonteDeVagas, VagaEncontrada } from '../../aplicacao/portas';
import { BUSCAS_GUPY, consultasPresenciaisERemotas } from '../../dominio/consulta';
import type { Consulta } from '../../dominio/consulta';
import type { LeitorDePagina } from './clienteHttp';

const URL_DA_API = 'https://portal.gupy.io/api/job-search/jobs';
const CIDADES = 'São Bernardo do Campo,Diadema,Santo André,São Caetano do Sul,São Paulo';
const LIMITE_MAXIMO_DA_API = '100';

interface VagaDaGupy {
  id: number | string;
  name?: string;
  careerPageName?: string;
  jobUrl?: string;
  publishedDate?: string;
  workplaceType?: string;
  city?: string;
  state?: string;
  description?: string;
}

export function urlDaConsultaGupy(consulta: Consulta): string {
  const parametros = new URLSearchParams({
    limit: LIMITE_MAXIMO_DA_API,
    offset: '0',
    jobName: consulta.termo,
    ...(consulta.remota ? { workplaceType: 'remote' } : { city: CIDADES, state: 'São Paulo' }),
  });
  return `${URL_DA_API}?${parametros}`;
}

export function interpretarGupy(json: string, consulta: Consulta): VagaEncontrada[] {
  const { data = [] } = JSON.parse(json) as { data?: VagaDaGupy[] };
  return data.map((vaga) => ({
    idOriginal: String(vaga.id),
    titulo: vaga.name?.trim() ?? '',
    empresa: vaga.careerPageName ?? '',
    url: vaga.jobUrl ?? '',
    publicadaEm: vaga.publishedDate ?? null,
    remota: consulta.remota || vaga.workplaceType === 'remote',
    // A própria API já filtrou por cidade: a consulta presencial não precisa de novo filtro.
    local: '',
    descricaoTexto: vaga.description,
  }));
}

export function criarFonteGupy(ler: LeitorDePagina): FonteDeVagas {
  return {
    id: 'gupy',
    permiteLerPaginaDaVaga: true,
    buscaPrecisa: true,
    consultas: () => consultasPresenciaisERemotas(BUSCAS_GUPY),
    buscar: async (consulta) => interpretarGupy(await ler(urlDaConsultaGupy(consulta)), consulta),
  };
}
