import { describe, expect, it } from 'vitest';
import { extrairSecoesDoHtml, extrairSecoesDoTexto } from './extrairSecoes';

describe('extrairSecoesDoHtml', () => {
  it('começa em Responsabilidades e preserva a hierarquia', () => {
    const html = `<p>Somos incríveis</p>
      <h2>Responsabilidades e atribuições</h2><ul><li>Programar</li><li>Testar</li></ul>
      <h2>Requisitos e qualificações</h2><p><strong>Obrigatório</strong></p><ul><li>Git</li></ul>
      <h2>Benefícios</h2><p>VR &amp; VT</p>`;
    expect(extrairSecoesDoHtml(html)).toEqual([
      { titulo: 'Responsabilidades', blocos: [{ tipo: 'item', texto: 'Programar' }, { tipo: 'item', texto: 'Testar' }] },
      { titulo: 'Requisitos', blocos: [{ tipo: 'subtitulo', texto: 'Obrigatório' }, { tipo: 'item', texto: 'Git' }] },
      { titulo: 'Benefícios', blocos: [{ tipo: 'texto', texto: 'VR & VT' }] },
    ]);
  });

  it('mostra o texto inteiro quando não há o título Responsabilidades', () => {
    expect(extrairSecoesDoHtml('<h3>O que buscamos?</h3><ul><li>Curiosidade</li></ul>')).toEqual([
      { titulo: 'O que buscamos?', blocos: [{ tipo: 'item', texto: 'Curiosidade' }] },
    ]);
  });
});

describe('extrairSecoesDoTexto', () => {
  it('separa as seções coladas pela API', () => {
    const texto =
      'Marketing da empresa. Responsabilidades e atribuiçõesEntender as demandas;Desenvolvimento em Java/.NET (C#);Requisitos e qualificaçõesCursando Ensino Superior;Benefícios:Vale refeição';
    const secoes = extrairSecoesDoTexto(texto);
    expect(secoes.map((secao) => secao.titulo)).toEqual(['Responsabilidades', 'Requisitos', 'Benefícios']);
    expect(secoes[0]?.blocos).toContainEqual({ tipo: 'item', texto: 'Desenvolvimento em Java/.NET (C#)' });
  });

  it('ignora "responsabilidades" no meio de uma frase', () => {
    const secoes = extrairSecoesDoTexto('Você terá suas responsabilidades. Requisitos: Git;');
    expect(secoes[0]?.titulo).toBe('Descrição');
  });

  it('devolve vazio sem texto', () => {
    expect(extrairSecoesDoTexto('')).toEqual([]);
  });
});
