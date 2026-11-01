import { describe, expect, it } from 'vitest';
import { atendeLocalizacao, categoriaDaVaga, motivoDeDescarte, textoIndicaRemoto } from './filtroDeVagas';

describe('motivoDeDescarte', () => {
  it.each([
    'Desenvolvedor Java Sênior',
    'Analista de Dados Pleno',
    'Coordenador de TI',
    'Gerente de Projetos de TI',
    'Analista de Sistemas PL',
    'Staff Software Engineer, Foundations',
    'Service Desk Incident Coordinator',
    'Tech Lead Java',
  ])('descarta cargo avançado: %s', (titulo) => {
    expect(motivoDeDescarte(titulo)).toBe('cargo avançado');
  });

  it.each([
    'Fullstack AI Engineer - (JR/PL)',
    'Analista PL/SQL',
    'Estagiária Sênior de Dados',
    'Assistente de Coordenação de TI',
    'Pessoa Assistente de Coordenação de TI',
  ])('mantém nível de entrada: %s', (titulo) => {
    expect(motivoDeDescarte(titulo)).toBeNull();
  });

  it.each([
    'Encanador de Infra | Fundação',
    'Auxiliar de Desenvolvimento Infantil | Bom Retiro, São Paulo/SP',
    'Professor(a) Regente Ensino Fundamental II | Tecnologia',
    'TÉCNICO(A) DE MANUTENÇÃO EM SISTEMAS DE ENERGIA',
    'Encarregado III - Sistemas Complexos',
    'Analista Facilities Júnior - Desenvolvimento de Projetos de Arquitetura',
    'Mafra | Suporte Comercial | São Paulo',
    'Assistente Suporte Vendas',
    'Estágio em Assessoria de Imprensa (PR)',
    'Estágio de Nutrição | Cozinha Delivery',
    'ESTAGIÁRIO DE CUSTOS',
    'Estágio em Processos - SP',
    'Estágio em Mídias Sociais',
    'Assistente Administrativo',
    'SDR (Segmento Tecnologia)',
    'Estagiário | Penal Empresarial',
  ])('descarta fora de tecnologia: %s', (titulo) => {
    expect(motivoDeDescarte(titulo)).toBe('fora de tecnologia');
  });

  it.each([
    'Estágio em Suprimentos com SAP',
    'Estagiário(a) de Finanças | Dados e Automação',
    'Analista de Suporte Protheus',
    'ANALISTA SUPORTE JR N1',
    'Analista de Sistemas Java - (Sustentação)',
    'Jovem Aprendiz (TI)',
    'Trainee | Tecnologia da Informação (TI)',
    'ANALISTA DE SERVICE DESK JR - BILÍNGUE',
    'Arquiteto Devops Jr',
    'Estágio com ênfase em Banco de Dados',
    'Estagiário',
    'Programa de estágio Rocontec',
    'Analista de Infraestrutura Jr',
  ])('mantém tecnologia ou título sem área: %s', (titulo) => {
    expect(motivoDeDescarte(titulo)).toBeNull();
  });
});

describe('motivoDeDescarte em site de busca aproximada', () => {
  it.each(['Vendedor Externo', 'Analista de Atendimento I', 'Analista de Gestão de Sinistros Jr', 'Analista de Backoffice'])(
    'exige que o título cite tecnologia: %s',
    (titulo) => {
      expect(motivoDeDescarte(titulo, { buscaPrecisa: false })).toBe('fora de tecnologia');
      expect(motivoDeDescarte(titulo)).toBeNull();
    },
  );

  it.each(['Analista de QA', 'Assistente de Tecnologia da Informação', 'Analista de Service Desk', 'L3 Field Support'])(
    'mantém: %s',
    (titulo) => {
      expect(motivoDeDescarte(titulo, { buscaPrecisa: false })).toBeNull();
    },
  );
});

describe('automação e RPA', () => {
  it.each([
    'Analista de Suporte RPA',
    'Programador Júnior (RPA)',
    'Estágio em Automação de Processos Fiscais',
    'QA Automation Engineer Júnior - REMOTO',
    'Analista de BI e Automação de Processos',
    'Assistente Administrativo (Processos de Automação)',
    'ANALISTA DE AUTOMAÇÃO DE DADOS',
  ])('mantém: %s', (titulo) => {
    expect(motivoDeDescarte(titulo, { buscaPrecisa: false })).toBeNull();
    expect(categoriaDaVaga(titulo, 'TI')).toMatch(/Automação|Estágio/);
  });

  it.each([
    'ENFERMEIRO JR - CENTRO CIRURGICO/RPA',
    'Técnico de Enfermagem RPA - Hospital',
    'BR - Estágio em Engenharia Automação Industrial',
    'Técnico(a) de Automação',
    'Pessoa Técnica de Campo II (Automação)',
    'ANALISTA CONTÁBIL - SISTEMA PROTHEUS',
  ])('descarta homônimo: %s', (titulo) => {
    expect(motivoDeDescarte(titulo)).toBe('fora de tecnologia');
  });

  it('descarta RPA de nível avançado', () => {
    expect(motivoDeDescarte('DESENVOLVEDOR RPA SR')).toBe('cargo avançado');
    expect(motivoDeDescarte('Mid-Level UiPath Test Automation Developer')).toBe('cargo avançado');
  });
});

describe('categoriaDaVaga', () => {
  it('prefere o título à consulta', () => {
    expect(categoriaDaVaga('Desenvolvedor(a) Frontend', 'Suporte')).toBe('Desenvolvimento');
    expect(categoriaDaVaga('Estágio em TI Service Desk', 'Suporte')).toBe('Estágio');
    expect(categoriaDaVaga('Técnico de Help Desk', 'Suporte')).toBe('Outras');
    expect(categoriaDaVaga('Analista Suporte Jr', 'TI')).toBe('Suporte');
  });

  it('usa a consulta quando o título não decide, sem chamar de estágio o que não é', () => {
    expect(categoriaDaVaga('Analista de Projetos', 'TI')).toBe('TI');
    expect(categoriaDaVaga('Arquiteto de Soluções de IA', 'Estágio')).toBe('TI');
    expect(categoriaDaVaga('Engenheiro de Inteligência Artificial', 'Automação')).toBe('TI');
  });
});

describe('atendeLocalizacao', () => {
  it('aceita remota, cidades atendidas e local não informado', () => {
    expect(atendeLocalizacao(true, 'Recife')).toBe(true);
    expect(atendeLocalizacao(false, 'São Paulo, São Paulo, Brazil')).toBe(true);
    expect(atendeLocalizacao(false, 'Santo Andre')).toBe(true);
    expect(atendeLocalizacao(false, '')).toBe(true);
  });

  it('recusa cidades fora da região', () => {
    expect(atendeLocalizacao(false, 'Rio de Janeiro / RJ')).toBe(false);
    expect(atendeLocalizacao(false, 'Santana de Parnaíba')).toBe(false);
  });
});

describe('textoIndicaRemoto', () => {
  it('reconhece as formas usadas pelas fontes', () => {
    expect(textoIndicaRemoto('100% Home Office')).toBe(true);
    expect(textoIndicaRemoto('Trabalho remoto')).toBe(true);
    expect(textoIndicaRemoto('São Paulo - SP')).toBe(false);
  });
});
