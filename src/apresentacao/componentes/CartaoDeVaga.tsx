import { NOMES_DAS_FONTES, type Vaga } from '../../dominio/vaga';
import { dataEHora, modalidade } from '../formatacao';

interface Propriedades {
  vaga: Vaga;
  vista: boolean;
  aoAlternarVista: (marcada: boolean) => void;
  aoAbrirDescricao: () => void;
}

export function CartaoDeVaga({ vaga, vista, aoAlternarVista, aoAbrirDescricao }: Propriedades) {
  const empresaELocal = [vaga.empresa, vaga.local].filter(Boolean).join(' · ');

  return (
    <article className={`vacancy-card${vista ? ' applied' : ''}`}>
      <div className="vacancy-card-content">
        <div className="vacancy-header">
          <h3 className="vacancy-title">{vaga.titulo || 'Sem título'}</h3>
          <span className={`vacancy-badge ${vaga.remota ? 'remote' : 'onsite'}`}>{modalidade(vaga)}</span>
        </div>
        {empresaELocal && <p className="vacancy-company">{empresaELocal}</p>}
        <p className="vacancy-tags">
          <span className="vacancy-topic">{vaga.categoria}</span>
          <span className="vacancy-source">{NOMES_DAS_FONTES[vaga.fonte]}</span>
        </p>
        <div className="vacancy-footer">
          <div className="vacancy-status">
            <span className="vacancy-date">{dataEHora(vaga)}</span>
            <label className="apply-toggle">
              <input type="checkbox" checked={vista} onChange={(e) => aoAlternarVista(e.target.checked)} />
              <span className="apply-toggle-slider" />
              <span className="apply-toggle-label">Vista</span>
            </label>
          </div>
          <div className="vacancy-actions">
            <button type="button" className="desc-btn" aria-haspopup="dialog" onClick={aoAbrirDescricao}>
              Ver descrição
            </button>
            <a href={vaga.url} target="_blank" rel="noopener noreferrer" className="apply-btn" onClick={() => aoAlternarVista(true)}>
              Candidatar-se
            </a>
          </div>
        </div>
      </div>
    </article>
  );
}
