import { describe, expect, it } from 'vitest';
import { criarDescritorHttp, descricaoDoJsonLd } from './descritorHttp';

const registro = { info: () => {}, aviso: () => {} };

function paginaCom(descricao: string): string {
  const dados = JSON.stringify({ '@type': 'JobPosting', description: descricao });
  return `<script type="application/ld+json">${dados}</script>`;
}

describe('descricaoDoJsonLd', () => {
  it('encontra o JobPosting e ignora o resto', () => {
    const outro = '<script type="application/ld+json">{"@type":"WebSite"}</script>';
    expect(descricaoDoJsonLd(outro + paginaCom('Texto'))).toBe('Texto');
    expect(descricaoDoJsonLd(outro)).toBeNull();
  });

  it('sobrevive a JSON-LD malformado', () => {
    expect(descricaoDoJsonLd('<script type="application/ld+json">{quebrado</script>')).toBeNull();
  });
});

describe('criarDescritorHttp', () => {
  const vaga = { id: 'a', url: 'https://portal.exemplo/1', lerPagina: true };

  it('usa o HTML da página quando há marcação', async () => {
    const descritor = criarDescritorHttp(async () => paginaCom('<ul><li>Programar</li></ul>'), registro);
    expect((await descritor.descrever([vaga])).get('a')?.fonte).toBe('html');
  });

  it('aceita descrição em texto puro na página', async () => {
    const descritor = criarDescritorHttp(async () => paginaCom('Requisitos: Git;'), registro);
    const descricao = (await descritor.descrever([vaga])).get('a');
    expect(descricao?.fonte).toBe('texto');
    expect(descricao?.secoes[0]?.titulo).toBe('Requisitos');
  });

  it('não lê a página de fonte que não permite', async () => {
    let leituras = 0;
    const descritor = criarDescritorHttp(async () => {
      leituras += 1;
      return '';
    }, registro);
    await descritor.descrever([{ ...vaga, lerPagina: false }]);
    expect(leituras).toBe(0);
  });

  it('desiste do portal depois de duas falhas', async () => {
    let leituras = 0;
    const descritor = criarDescritorHttp(async () => {
      leituras += 1;
      throw new Error('fora do ar');
    }, registro);
    for (const id of ['a', 'b', 'c', 'd']) await descritor.descrever([{ ...vaga, id }]);
    expect(leituras).toBe(2);
  });
});
