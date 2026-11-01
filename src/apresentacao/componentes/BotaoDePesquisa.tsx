import { URL_DO_WORKFLOW_DE_PESQUISA } from '../../config';

/** Um site estático não inicia workflows sem credencial: a pesquisa é iniciada na página do GitHub. */
export function BotaoDePesquisa() {
  return (
    <a
      className="btn btn-primary search-link"
      href={URL_DO_WORKFLOW_DE_PESQUISA}
      target="_blank"
      rel="noopener noreferrer"
      title="Abre o GitHub; clique em Run workflow para iniciar a pesquisa"
    >
      Pesquisar vagas
    </a>
  );
}
