import type { FonteDeVagas } from '../../aplicacao/portas';
import { criarFonteCatho } from './catho';
import type { LeitorDePagina } from './clienteHttp';
import { criarFonteGupy } from './gupy';
import { criarFonteInfojobs } from './infojobs';
import { criarFonteLinkedin } from './linkedin';
import { criarFonteProgramathor } from './programathor';
import { criarFonteRemotar } from './remotar';
import { criarFonteVagasCom } from './vagasCom';

/**
 * Para ligar ou desligar um site, basta mexer nesta lista. A ordem é a prioridade:
 * em vaga repetida entre sites, fica a da primeira fonte.
 *
 * Ficam de fora: Indeed e Glassdoor (respondem 403 a clientes automatizados) e
 * BNE (a listagem só trazia vagas de meses atrás).
 */
export function criarFontes(ler: LeitorDePagina, agora: () => Date): FonteDeVagas[] {
  return [
    criarFonteGupy(ler),
    criarFonteInfojobs(ler),
    criarFonteCatho(ler, agora),
    criarFonteVagasCom(ler, agora),
    criarFonteRemotar(ler),
    criarFonteProgramathor(ler),
    criarFonteLinkedin(ler),
  ];
}
