import { atendeLocalizacao, categoriaDaVaga, motivoDeDescarte } from '../dominio/filtroDeVagas';
import { semAcento } from '../dominio/texto';
import type { Consulta } from '../dominio/consulta';
import type { MapaDeDescricoes, ResultadoDaFonte, Vaga } from '../dominio/vaga';
import type {
  DescritorDeVagas,
  Espera,
  FonteDeVagas,
  Registro,
  RepositorioDeVagas,
  VagaEncontrada,
  VagasVistas,
} from './portas';
import { FonteBloqueadaError } from './portas';

const DIA_EM_MS = 86_400_000;
const MAX_DIAS_DE_PUBLICACAO = 4;
const DIAS_DE_RETENCAO_DAS_VAGAS = 7;
// Maior que a retenção: vaga sem data não pode "renascer" assim que sai do histórico.
const DIAS_DE_RETENCAO_DAS_VISTAS = 30;
const INTERVALO_ENTRE_CONSULTAS_MS = 1000;
const PAUSA_APOS_LIMITE_DE_REQUISICOES_MS = 60_000;

interface Coleta {
  fonte: FonteDeVagas;
  achados: { consulta: Consulta; vaga: VagaEncontrada }[];
  consultasComErro: number;
  totalDeConsultas: number;
}

export interface Dependencias {
  fontes: FonteDeVagas[];
  repositorio: RepositorioDeVagas;
  descritor: DescritorDeVagas;
  registro: Registro;
  espera: Espera;
  agora: () => Date;
}

export class TodasAsFontesFalharamError extends Error {
  constructor() {
    super('Nenhuma fonte respondeu; os dados atuais foram preservados.');
  }
}

export async function executarPesquisa(dependencias: Dependencias): Promise<ResultadoDaFonte[]> {
  const { fontes, repositorio, descritor, registro, agora } = dependencias;
  const instante = agora();

  const coletas = await Promise.all(fontes.map((fonte) => coletar(fonte, dependencias)));
  if (coletas.every((coleta) => coleta.consultasComErro === coleta.totalDeConsultas)) {
    throw new TodasAsFontesFalharamError();
  }

  const [vagasAtuais, vistasAtuais, descricoesAtuais] = await Promise.all([
    repositorio.carregarVagas(),
    repositorio.carregarVistas(),
    repositorio.carregarDescricoes(),
  ]);

  const vagas = vagasAtuais.filter((vaga) => continuaNoHistorico(vaga, instante));
  const vistas = vistasRecentes(vistasAtuais, instante);
  const chaves = new Set(vagas.map(chaveDaVaga));
  const novasPorFonte = new Map<string, { vaga: Vaga; encontrada: VagaEncontrada }[]>();

  // As fontes rodam em paralelo, mas entram na ordem declarada: em vaga repetida
  // entre sites, a primeira fonte da lista é a que fica.
  for (const { fonte, achados } of coletas) {
    const novas = achados.flatMap(({ consulta, vaga: encontrada }) => {
      const vaga = aceitarVaga(encontrada, consulta, fonte, vistas, chaves, instante);
      return vaga ? [{ vaga, encontrada }] : [];
    });
    novasPorFonte.set(fonte.id, novas);
    vagas.push(...novas.map(({ vaga }) => vaga));
  }

  const novas = coletas.flatMap(({ fonte }) =>
    (novasPorFonte.get(fonte.id) ?? []).map((nova) => ({ ...nova, fonte })),
  );
  const descricoesNovas = await descritor.descrever(
    novas.map(({ vaga, encontrada, fonte }) => ({
      id: vaga.id,
      url: vaga.url,
      lerPagina: fonte.permiteLerPaginaDaVaga,
      descricaoHtml: encontrada.descricaoHtml,
      descricaoTexto: encontrada.descricaoTexto,
    })),
  );

  const descricoes: MapaDeDescricoes = {};
  for (const vaga of vagas) {
    const descricao = descricoesNovas.get(vaga.id) ?? descricoesAtuais[vaga.id];
    if (descricao?.secoes.length) descricoes[vaga.id] = descricao;
  }

  const resultados: ResultadoDaFonte[] = coletas.map((coleta) => ({
    fonte: coleta.fonte.id,
    encontradas: coleta.achados.length,
    novas: novasPorFonte.get(coleta.fonte.id)?.length ?? 0,
    consultasComErro: coleta.consultasComErro,
    totalDeConsultas: coleta.totalDeConsultas,
  }));

  await repositorio.salvar({
    vagas: ordenarPorData(vagas),
    vistas,
    descricoes,
    ultimaExecucao: { executadaEm: instante.toISOString(), resultados },
  });

  for (const r of resultados) {
    registro.info(
      `${r.fonte}: ${r.encontradas} encontradas, ${r.novas} novas, ` +
        `${r.consultasComErro}/${r.totalDeConsultas} consultas com erro`,
    );
    // Página que mudou de layout não dá erro de rede: só deixa de trazer vagas.
    if (r.encontradas === 0 && r.consultasComErro === 0) {
      registro.aviso(`${r.fonte} não trouxe nenhuma vaga: confira se o site mudou.`);
    }
  }
  return resultados;
}

async function coletar(fonte: FonteDeVagas, dependencias: Dependencias): Promise<Coleta> {
  const { registro, espera } = dependencias;
  const consultas = fonte.consultas();
  const coleta: Coleta = {
    fonte,
    achados: [],
    consultasComErro: 0,
    totalDeConsultas: consultas.length,
  };

  for (const [indice, consulta] of consultas.entries()) {
    if (indice > 0) await espera.aguardar(fonte.intervaloEntreConsultasMs ?? INTERVALO_ENTRE_CONSULTAS_MS);
    try {
      const vagas = await buscarRespeitandoOLimite(fonte, consulta, espera);
      coleta.achados.push(...vagas.map((vaga) => ({ consulta, vaga })));
    } catch (erro) {
      if (erro instanceof FonteBloqueadaError) {
        // Insistir em um site que recusou o acesso só prolonga o bloqueio.
        coleta.consultasComErro += consultas.length - indice;
        registro.aviso(`${fonte.id} recusou o acesso (${erro.message}); as demais consultas foram canceladas.`);
        break;
      }
      coleta.consultasComErro += 1;
      registro.aviso(`${fonte.id} falhou em "${consulta.termo}": ${String(erro)}`);
    }
  }
  return coleta;
}

async function buscarRespeitandoOLimite(
  fonte: FonteDeVagas,
  consulta: Consulta,
  espera: Espera,
): Promise<VagaEncontrada[]> {
  try {
    return await fonte.buscar(consulta);
  } catch (erro) {
    if (!(erro instanceof FonteBloqueadaError && erro.temporario)) throw erro;
    await espera.aguardar(PAUSA_APOS_LIMITE_DE_REQUISICOES_MS);
    return fonte.buscar(consulta);
  }
}

/** Devolve a vaga pronta para entrar no histórico, ou `null` se ela não deve entrar. */
function aceitarVaga(
  encontrada: VagaEncontrada,
  consulta: Consulta,
  fonte: FonteDeVagas,
  vistas: VagasVistas,
  chaves: Set<string>,
  instante: Date,
): Vaga | null {
  if (!encontrada.titulo || !encontrada.url) return null;
  if (encontrada.publicadaEm && idadeEmDias(encontrada.publicadaEm, instante) > MAX_DIAS_DE_PUBLICACAO) {
    return null;
  }

  const id = `${fonte.id}-${encontrada.idOriginal}`;
  if (vistas[id]) return null;
  vistas[id] = instante.toISOString();

  if (motivoDeDescarte(encontrada.titulo, { buscaPrecisa: fonte.buscaPrecisa })) return null;
  if (!atendeLocalizacao(encontrada.remota, encontrada.local)) return null;

  const vaga: Vaga = {
    id,
    fonte: fonte.id,
    titulo: encontrada.titulo,
    empresa: encontrada.empresa,
    url: encontrada.url,
    publicadaEm: encontrada.publicadaEm ?? instante.toISOString(),
    categoria: categoriaDaVaga(encontrada.titulo, consulta.categoria),
    remota: encontrada.remota,
    local: encontrada.local,
    ...(encontrada.publicadaEm ? {} : { dataEstimada: true }),
  };

  const chave = chaveDaVaga(vaga);
  if (chaves.has(chave)) return null;
  chaves.add(chave);
  return vaga;
}

function continuaNoHistorico(vaga: Vaga, instante: Date): boolean {
  return (
    idadeEmDias(vaga.publicadaEm, instante) <= DIAS_DE_RETENCAO_DAS_VAGAS &&
    motivoDeDescarte(vaga.titulo) === null
  );
}

function vistasRecentes(vistas: VagasVistas, instante: Date): VagasVistas {
  return Object.fromEntries(
    Object.entries(vistas).filter(
      ([, vistaEm]) => idadeEmDias(vistaEm, instante) <= DIAS_DE_RETENCAO_DAS_VISTAS,
    ),
  );
}

function idadeEmDias(iso: string, instante: Date): number {
  const momento = Date.parse(iso);
  return Number.isNaN(momento) ? Number.POSITIVE_INFINITY : (instante.getTime() - momento) / DIA_EM_MS;
}

/** Identifica a mesma vaga publicada em sites diferentes. */
function chaveDaVaga(vaga: Vaga): string {
  const normalizar = (texto: string) => semAcento(texto).replace(/[^a-z0-9]/g, '');
  return `${normalizar(vaga.titulo)}|${normalizar(vaga.empresa)}|${vaga.remota}`;
}

function ordenarPorData(vagas: Vaga[]): Vaga[] {
  return [...vagas].sort((a, b) => b.publicadaEm.localeCompare(a.publicadaEm));
}
