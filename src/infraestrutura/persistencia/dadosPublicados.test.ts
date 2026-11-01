import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const PASTA = 'public/data';

// A publicação roda os testes: arquivo inválido (como um conflito de merge commitado)
// quebraria o site e a pesquisa seguinte.
describe('dados publicados', () => {
  it.each(readdirSync(PASTA).filter((arquivo) => arquivo.endsWith('.json')))('%s é JSON válido', (arquivo) => {
    expect(() => JSON.parse(readFileSync(join(PASTA, arquivo), 'utf-8'))).not.toThrow();
  });
});
