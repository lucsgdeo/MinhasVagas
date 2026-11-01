import { semAcento } from './texto';
import type { Categoria } from './vaga';

export type MotivoDeDescarte = 'cargo avançado' | 'fora de tecnologia';

const NIVEL_AVANCADO =
  /\b(?:sr|senior|pleno|especialista|gerente|diretor|coordenador\w*|supervisor\w*|lider\w*|staff|lead|principal|manager|head|coordinator|mid[- ]level)\b/;
const AREA_DE_GESTAO = /\b(?:coordenacao|supervisao|gerencia|direcao)\b/;
const PLENO_ABREVIADO = /\bpl\b(?!\s*\/\s*sql)/;
const NIVEL_DE_ENTRADA = /\b(?:jr|junior|trainee|estagi\w*|aprendiz)\w*/;
const CARGO_DE_ENTRADA_NO_INICIO =
  /^(?:pessoas?\s+)?(?:assistente|auxiliar|aprendiz|trainee|estagi\w*|operador|atendente|recepcionista|promotor)\b/;

function regexDeTermos(termos: string[]): RegExp {
  return new RegExp(`(?:^|[^\\p{L}\\p{N}])(?:${termos.join('|')})(?:$|[^\\p{L}\\p{N}])`, 'u');
}

/** Citar um destes termos basta: a vaga é de tecnologia, mesmo que cite outra área. */
const TECNOLOGIA_INEQUIVOCA = regexDeTermos([
  'ti',
  'tecnologia da informacao',
  'informatica',
  'computacao',
  'software',
  'desenvolvedor\\w*',
  'programador\\w*',
  'programacao',
  'dev',
  'devops',
  'devsecops',
  'front\\s*-?end',
  'back\\s*-?end',
  'full\\s*-?stack',
  'mobile',
  'qa',
  'dados',
  'data science',
  'data engineer\\w*',
  'machine learning',
  'business intelligence',
  'bi',
  'erp',
  'sap',
  'protheus',
  'salesforce',
  'cloud',
  'aws',
  'azure',
  'java',
  'python',
  'react',
  'angular',
  'node(?:js)?',
  '\\.net',
  'help\\s*desk',
  'service\\s*desk',
  'seguranca da informacao',
  'ciberseguranca',
  'governanca de si',
  'suporte tecnico',
  'analista de sistemas',
  'analista de suporte',
  'analista suporte',
  'tecnico de suporte',
  'suporte de ti',
  'analista de redes',
  'suporte redes',
  'desenvolvimento de sistemas',
  'desenvolvimento de software',
  'engenharia de dados',
  'geoprocessamento',
  'rpa',
  'uipath',
  'blue prism',
  'automation anywhere',
  'power (?:automate|platform|apps|bi)',
  'low[ -]?code',
  'hiperautomacao',
  'automac(?:ao|oes) de (?:processos|testes|dados)',
  'processos de automacao',
]);

/**
 * Homônimos: vencem até a lista acima. "RPA" em hospital é a recuperação pós-anestésica,
 * e a automação destes cargos é a de fábrica e prédios, não a de software.
 */
const NUNCA_TECNOLOGIA = regexDeTermos([
  'enferm\\w*',
  'centro cirurgico',
  'analista contabil',
  'automacao (?:industrial|predial|residencial)',
  'tecnic[oa](?:\\(a\\))? de automacao',
  'tecnica de campo',
  'mecatronic\\w*',
  'eletromecanic\\w*',
  'eletrotecnic\\w*',
  'instrumentacao',
]);

/** Áreas e ocupações que não são de tecnologia, ainda que o título use "suporte" ou "sistemas". */
const FORA_DE_TECNOLOGIA = regexDeTermos([
  'recursos? humanos?',
  'gente e gestao',
  'departamento pessoal',
  'remuneracao',
  'folha de pagamento',
  'recrutament\\w*',
  'selecao',
  'people analytics',
  'juridic\\w*',
  'direito',
  'penal',
  'advogad\\w*',
  'contencioso',
  'tributari\\w*',
  'regulatori\\w*',
  'pedagog\\w*',
  'ensino (?:medio|fundamental)',
  'desenvolvimento infantil',
  'professor\\w*',
  'academic\\w*',
  'educacao fisica',
  'nutricao',
  'cozinha',
  'engenharia civil',
  'obras?',
  'construt\\w*',
  'arquitetura(?! de (?:software|solucoes|sistemas|dados))',
  'encanador\\w*',
  'encarregado\\w*',
  'manutencao',
  'energia',
  'facilities',
  'suprimentos?',
  'supply chain',
  'compras?',
  'logistic\\w*',
  'transportes?',
  'pcp',
  'financ\\w*',
  'credito',
  'custos?',
  'precificacao',
  'pricing',
  'controladoria',
  'contab\\w*',
  'contador\\w*',
  'auditoria',
  'tesouraria',
  'fiscal',
  'importacao',
  'exportacao',
  'comercio exterior',
  'comercial',
  'vendas?',
  'sales',
  'sdr',
  'pos[ -]vendas?',
  'negoci\\w*',
  'suporte ao cliente',
  'atendimento ao cliente',
  'marketing',
  'branding',
  'midias?',
  'midias sociais',
  'redes sociais',
  'social media',
  'comunicac\\w*',
  'assessoria de imprensa',
  'publicitari\\w*',
  'administrativ\\w*',
  'curadoria',
  'operacoes',
  'engenharia clinica',
  'construcao civil',
  'dho',
  'inovacao',
  'comunidade',
  'media',
  'farmacia',
  'loja',
  'shopping',
  'varejo',
]);

/** Estes termos só indicam tecnologia quando nada no título aponta para outra área. */
const TECNOLOGIA_AMBIGUA = regexDeTermos([
  'tecnologia',
  'tecnologic\\w*',
  'desenvolvimento',
  'sistemas?',
  'automacao',
  'infra',
  'infraestrutura',
  'redes?',
  'testes?',
  'suporte',
  'automation',
]);

/** Sinais extras aceitos nos sites cuja busca aproximada traz cargos de qualquer área. */
const OUTROS_SINAIS_DE_TECNOLOGIA = regexDeTermos([
  'support',
  'ia',
  'ai',
  'inteligencia artificial',
  'engineer',
  'analytics',
  'zabbix',
]);

const ESTAGIO_COM_AREA_NOMEADA = /\bestagi\w*(?:\(a\)|\(o\))?\s+(?:em|de|na|no|com)\s+/;

function ehCargoAvancado(titulo: string): boolean {
  if (NIVEL_DE_ENTRADA.test(titulo)) return false;
  if (NIVEL_AVANCADO.test(titulo) || PLENO_ABREVIADO.test(titulo)) return true;
  return AREA_DE_GESTAO.test(titulo) && !CARGO_DE_ENTRADA_NO_INICIO.test(titulo.trim());
}

function ehForaDeTecnologia(titulo: string): boolean {
  if (NUNCA_TECNOLOGIA.test(titulo)) return true;
  if (TECNOLOGIA_INEQUIVOCA.test(titulo)) return false;
  if (FORA_DE_TECNOLOGIA.test(titulo)) return true;
  return ESTAGIO_COM_AREA_NOMEADA.test(titulo) && !TECNOLOGIA_AMBIGUA.test(titulo);
}

function citaTecnologia(titulo: string): boolean {
  return (
    TECNOLOGIA_INEQUIVOCA.test(titulo) ||
    TECNOLOGIA_AMBIGUA.test(titulo) ||
    OUTROS_SINAIS_DE_TECNOLOGIA.test(titulo)
  );
}

/**
 * Devolve por que a vaga deve sair, ou `null` se ela fica.
 *
 * Com `buscaPrecisa`, título sem área ("Estagiário", "Analista Jr") passa: a fonte já
 * buscou pelo termo no título, e descartar errado esconde uma oportunidade para sempre.
 * Sem ela, o site traz cargos parecidos de qualquer área, e o título precisa citar tecnologia.
 */
export function motivoDeDescarte(
  tituloOriginal: string,
  { buscaPrecisa = true }: { buscaPrecisa?: boolean } = {},
): MotivoDeDescarte | null {
  const titulo = semAcento(tituloOriginal);
  if (ehCargoAvancado(titulo)) return 'cargo avançado';
  if (ehForaDeTecnologia(titulo)) return 'fora de tecnologia';
  if (!buscaPrecisa && !citaTecnologia(titulo)) return 'fora de tecnologia';
  return null;
}

const ESTAGIO = /\b(?:estagi\w*|aprendiz|trainee)\b/;
const DESENVOLVIMENTO = regexDeTermos([
  'desenvolv\\w*',
  'programador\\w*',
  'software',
  'dev',
  'devops',
  'devsecops',
  'front\\s*-?end',
  'back\\s*-?end',
  'full\\s*-?stack',
  'engineer',
  'qa',
  'analista de sistemas',
]);
const AUTOMACAO = regexDeTermos([
  'rpa',
  'uipath',
  'blue prism',
  'automation\\w*',
  'automac(?:ao|oes)',
  'hiperautomacao',
  'power (?:automate|platform|apps)',
  'low[ -]?code',
]);
const SUPORTE = regexDeTermos(['suporte', 'support']);
const CENTRAL_DE_ATENDIMENTO = regexDeTermos(['help\\s*desk', 'service\\s*desk', 'infra', 'infraestrutura']);

/** O título vence a consulta: a busca aproximada traz vagas de outras categorias. */
export function categoriaDaVaga(tituloOriginal: string, categoriaDaConsulta: Categoria): Categoria {
  const titulo = semAcento(tituloOriginal);
  if (ESTAGIO.test(titulo)) return 'Estágio';
  if (AUTOMACAO.test(titulo)) return 'Automação';
  if (CENTRAL_DE_ATENDIMENTO.test(titulo)) return 'Outras';
  if (SUPORTE.test(titulo)) return 'Suporte';
  if (DESENVOLVIMENTO.test(titulo)) return 'Desenvolvimento';
  // Estas duas categorias precisam estar no título; a busca aproximada não basta para afirmá-las.
  return categoriaDaConsulta === 'Estágio' || categoriaDaConsulta === 'Automação' ? 'TI' : categoriaDaConsulta;
}

const EMPRESAS_IGNORADAS = regexDeTermos(['baires\\s*dev']);

/** Para ignorar outra empresa, basta incluir o nome na lista acima, sem acento. */
export function empresaIgnorada(empresa: string): boolean {
  return EMPRESAS_IGNORADAS.test(semAcento(empresa));
}

const CIDADES_ATENDIDAS = regexDeTermos([
  'sao bernardo do campo',
  'diadema',
  'santo andre',
  'sao caetano do sul',
  'sao paulo',
]);

/** Local vazio passa: a fonte não informou, e o filtro não adivinha. */
export function atendeLocalizacao(remota: boolean, local: string): boolean {
  if (remota || !local.trim()) return true;
  return CIDADES_ATENDIDAS.test(semAcento(local));
}

/** Indica vaga remota a partir do texto de localização informado pela fonte. */
export function textoIndicaRemoto(texto: string): boolean {
  return /\b(?:remot[oa]|home\s*office|teletrabalho)\b/.test(semAcento(texto));
}
