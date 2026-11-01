import { NOMES_DAS_FONTES, type Vaga } from '../../dominio/vaga';
import { dataEHora, modalidade } from '../formatacao';

interface Propriedades {
  vaga: Vaga;
  vista: boolean;
  aoAlternarVista: (marcada: boolean) => void;
  aoAbrirDescricao: () => void;
}

export function CartaoDeVaga({ vaga, vista, aoAlternarVista, aoAbrirDescricao }: Propriedades) {
  return (
    <article className={`vacancy-card${vista ? ' applied' : ''}`}>
      <div className="vacancy-card-content">
        <div className="vacancy-header">
          <h3 className="vacancy-title">{vaga.titulo || 'Sem título'}</h3>
          <span className={`vacancy-badge ${vaga.remota ? 'remote' : 'onsite'}`}>{modalidade(vaga)}</span>
        </div>
        <div>
          <span className="vacancy-topic">{vaga.categoria}</span>
          <span className="vacancy-source">{NOMES_DAS_FONTES[vaga.fonte]}</span>
        </div>
        {vaga.empresa && <span className="vacancy-company">{vaga.empresa}</span>}
        <div className="vacancy-footer">
          <span className="vacancy-date">{dataEHora(vaga)}</span>
          <div className="vacancy-actions">
            <button type="button" className="desc-btn" aria-haspopup="dialog" onClick={aoAbrirDescricao}>
              Ver descrição
            </button>
            <label className="apply-toggle">
              <input type="checkbox" checked={vista} onChange={(e) => aoAlternarVista(e.target.checked)} />
              <span className="apply-toggle-slider" />
              <span className="apply-toggle-label">Vista</span>
            </label>
            <a href={vaga.url} target="_blank" rel="noopener noreferrer" className="apply-btn" onClick={() => aoAlternarVista(true)}>
              Candidatar-se →
            </a>
          </div>
        </div>
      </div>
    </article>
  );
}
