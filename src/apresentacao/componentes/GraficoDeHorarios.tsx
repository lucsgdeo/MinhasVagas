import { useMemo, useState } from 'react';
import { TODAS, vagasPorHora } from '../../aplicacao/filtrarVagas';
import { CATEGORIAS, type Categoria, type Vaga } from '../../dominio/vaga';

function somar(contagem: number[], inicio: number, fim: number): number {
  return contagem.slice(inicio, fim).reduce((total, valor) => total + valor, 0);
}

export function GraficoDeHorarios({ vagas }: { vagas: Vaga[] }) {
  const [categoria, setCategoria] = useState<Categoria | typeof TODAS>(TODAS);
  const contagem = useMemo(
    () => vagasPorHora(vagas.filter((vaga) => categoria === TODAS || vaga.categoria === categoria)),
    [vagas, categoria],
  );
  const maximo = Math.max(...contagem);
  const resumo = [
    { rotulo: 'Total', valor: somar(contagem, 0, 24) },
    { rotulo: 'Pico', valor: `${contagem.indexOf(maximo)}h (${maximo})` },
    { rotulo: 'Manhã (6-12h)', valor: somar(contagem, 6, 12) },
    { rotulo: 'Tarde (12-18h)', valor: somar(contagem, 12, 18) },
    { rotulo: 'Noite (18-24h)', valor: somar(contagem, 18, 24) },
    { rotulo: 'Madrugada (0-6h)', valor: somar(contagem, 0, 6) },
  ];

  return (
    <>
      <div className="filters">
        <div className="filter-pills">
          {[TODAS, ...CATEGORIAS].map((opcao) => (
            <button
              key={opcao}
              type="button"
              aria-pressed={categoria === opcao}
              className={`filter-pill${categoria === opcao ? ' active' : ''}`}
              onClick={() => setCategoria(opcao as Categoria | typeof TODAS)}
            >
              {opcao === TODAS ? 'Todas' : opcao}
            </button>
          ))}
        </div>
      </div>
      <div className="schedule-container">
        <div className="card">
          <h3 className="card-title">Distribuição de Vagas por Hora de Publicação</h3>
          <div className="schedule-bars">
            {contagem.map((quantidade, hora) => (
              <div key={hora} className="schedule-bar-row">
                <span className="schedule-bar-label">{`${String(hora).padStart(2, '0')}:00`}</span>
                <div className="schedule-bar-track">
                  <div className="schedule-bar-fill" style={{ width: `${maximo > 0 ? (quantidade / maximo) * 100 : 0}%` }} />
                </div>
                <span className="schedule-bar-value">{quantidade}</span>
              </div>
            ))}
          </div>
          <div className="schedule-summary">
            <h4 className="summary-title">Resumo</h4>
            <div className="summary-grid">
              {resumo.map(({ rotulo, valor }) => (
                <div key={rotulo} className="summary-item">
                  <p className="summary-label">{rotulo}</p>
                  <p className="summary-value">{valor}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
