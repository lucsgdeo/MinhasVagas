import type { Categoria } from './vaga';

export interface Consulta {
  termo: string;
  categoria: Categoria;
  remota: boolean;
}

interface Busca {
  termo: string;
  categoria: Categoria;
}

/**
 * A ordem importa: a primeira busca que encontra uma vaga define a categoria dela.
 * A Gupy busca por radical e devolve conjuntos diferentes para cada termo, por isso
 * "estagio" e "estagiario" são buscas separadas.
 */
export const BUSCAS_GUPY: readonly Busca[] = [
  { termo: 'Suporte', categoria: 'Suporte' },
  { termo: 'estagio', categoria: 'Estágio' },
  { termo: 'estagiario', categoria: 'Estágio' },
  { termo: 'desenvolvedor', categoria: 'Desenvolvimento' },
  { termo: 'desenvolvimento', categoria: 'Desenvolvimento' },
  { termo: 'dev', categoria: 'Desenvolvimento' },
  { termo: 'software', categoria: 'Desenvolvimento' },
  { termo: 'devops', categoria: 'Desenvolvimento' },
  { termo: 'sistemas', categoria: 'Desenvolvimento' },
  { termo: 'rpa', categoria: 'Automação' },
  { termo: 'automacao', categoria: 'Automação' },
  { termo: 'automacao de processos', categoria: 'Automação' },
  { termo: 'automation', categoria: 'Automação' },
  { termo: 'uipath', categoria: 'Automação' },
  { termo: 'power automate', categoria: 'Automação' },
  { termo: 'power platform', categoria: 'Automação' },
  { termo: 'low code', categoria: 'Automação' },
  { termo: 'TI', categoria: 'TI' },
  { termo: 'tecnologia', categoria: 'TI' },
  { termo: 'infra', categoria: 'Outras' },
  { termo: 'help desk', categoria: 'Outras' },
  { termo: 'service desk', categoria: 'Outras' },
];

/** Lista menor para os sites que respondem com páginas HTML inteiras. */
export const BUSCAS_GERAIS: readonly Busca[] = [
  { termo: 'suporte ti', categoria: 'Suporte' },
  { termo: 'estagio ti', categoria: 'Estágio' },
  { termo: 'desenvolvedor', categoria: 'Desenvolvimento' },
  { termo: 'analista de sistemas', categoria: 'Desenvolvimento' },
  { termo: 'devops', categoria: 'Desenvolvimento' },
  { termo: 'rpa', categoria: 'Automação' },
  { termo: 'automacao de processos', categoria: 'Automação' },
  { termo: 'power automate', categoria: 'Automação' },
  { termo: 'analista de ti', categoria: 'TI' },
  { termo: 'help desk', categoria: 'Outras' },
  { termo: 'service desk', categoria: 'Outras' },
];

export function consultasPresenciaisERemotas(buscas: readonly Busca[]): Consulta[] {
  return buscas.flatMap((busca) => [
    { ...busca, remota: false },
    { ...busca, remota: true },
  ]);
}

export function consultasDaRegiao(buscas: readonly Busca[]): Consulta[] {
  return buscas.map((busca) => ({ ...busca, remota: false }));
}
