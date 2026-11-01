import type { SubAba } from '../../aplicacao/filtrarVagas';

const VAZIOS: Record<SubAba, { titulo: string; texto: string }> = {
  recentes: { titulo: 'Nenhuma vaga nova', texto: 'Nada publicado hoje e ontem ainda não visto' },
  'nao-vistas': { titulo: 'Tudo já visto', texto: 'Você já marcou como vistas todas as vagas com os filtros atuais' },
  todas: { titulo: 'Nenhuma vaga encontrada', texto: 'Tente ajustar os filtros ou a busca' },
};

export function Carregando() {
  return (
    <div className="loading">
      <div className="spinner" />
      <p>Carregando vagas...</p>
    </div>
  );
}

export function EstadoVazio({ subAba }: { subAba: SubAba }) {
  const { titulo, texto } = VAZIOS[subAba];
  return (
    <div className="empty-state">
      <h3 className="empty-title">{titulo}</h3>
      <p className="empty-text">{texto}</p>
    </div>
  );
}

export function EstadoDeErro({ mensagem, aoTentarDeNovo }: { mensagem: string; aoTentarDeNovo: () => void }) {
  return (
    <div className="error-state">
      <h3 className="error-title">Erro ao carregar vagas</h3>
      <p className="error-text">{mensagem}</p>
      <button type="button" className="btn btn-primary" onClick={aoTentarDeNovo}>Tentar novamente</button>
    </div>
  );
}
