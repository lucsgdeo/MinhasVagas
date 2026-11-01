import { executarPesquisa } from '../aplicacao/executarPesquisa';
import type { Registro } from '../aplicacao/portas';
import { criarDescritorHttp } from '../infraestrutura/descricoes/descritorHttp';
import { lerPagina } from '../infraestrutura/fontes/clienteHttp';
import { criarFontes } from '../infraestrutura/fontes';
import { criarRepositorioEmArquivos } from '../infraestrutura/persistencia/repositorioEmArquivos';

const PASTA_DE_DADOS = process.env.PASTA_DE_DADOS ?? 'public/data';

const registro: Registro = {
  info: (mensagem) => console.log(mensagem),
  aviso: (mensagem) => console.warn(`⚠️ ${mensagem}`),
};
const agora = () => new Date();

try {
  const resultados = await executarPesquisa({
    fontes: criarFontes(lerPagina, agora),
    repositorio: criarRepositorioEmArquivos(PASTA_DE_DADOS),
    descritor: criarDescritorHttp(lerPagina, registro),
    espera: { aguardar: (ms) => new Promise((resolver) => setTimeout(resolver, ms)) },
    registro,
    agora,
  });
  const novas = resultados.reduce((total, resultado) => total + resultado.novas, 0);
  console.log(`Total de vagas novas: ${novas}`);
} catch (erro) {
  // A pilha completa é o que permite diagnosticar uma falha pelo log do GitHub Actions.
  console.error('❌ A pesquisa falhou:', erro);
  process.exitCode = 1;
}
