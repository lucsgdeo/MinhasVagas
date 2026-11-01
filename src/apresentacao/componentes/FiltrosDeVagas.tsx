import { TODAS, type SubAba } from '../../aplicacao/filtrarVagas';
import { CATEGORIAS, NOMES_DAS_FONTES, type Categoria, type IdFonte, type Vaga } from '../../dominio/vaga';

const SUBABAS: { id: SubAba; rotulo: string; dica?: string }[] = [
  { id: 'recentes', rotulo: 'Últimos 2 dias', dica: 'Vagas publicadas hoje ou ontem que você ainda não marcou como vistas' },
  { id: 'nao-vistas', rotulo: 'Não vistas', dica: 'Todas as vagas que você ainda não marcou como vistas, sem limite de data' },
  { id: 'todas', rotulo: 'Todas' },
];

const IDS_DAS_FONTES = Object.keys(NOMES_DAS_FONTES) as IdFonte[];

interface Propriedades {
  subAba: SubAba;
  categoria: Categoria | typeof TODAS;
  fonte: IdFonte | typeof TODAS;
  busca: string;
  vagasDeTodasAsAreas: Vaga[];
  aoMudarSubAba: (subAba: SubAba) => void;
  aoMudarCategoria: (categoria: Categoria | typeof TODAS) => void;
  aoMudarFonte: (fonte: IdFonte | typeof TODAS) => void;
  aoMudarBusca: (busca: string) => void;
}

export function FiltrosDeVagas(props: Propriedades) {
  const { subAba, categoria, fonte, busca, vagasDeTodasAsAreas, aoMudarSubAba, aoMudarCategoria, aoMudarFonte, aoMudarBusca } = props;
  const areas: { id: Categoria | typeof TODAS; rotulo: string; total: number }[] = [
    { id: TODAS, rotulo: 'Todas', total: vagasDeTodasAsAreas.length },
    ...CATEGORIAS.map((id) => ({
      id,
      rotulo: id,
      total: vagasDeTodasAsAreas.filter((vaga) => vaga.categoria === id).length,
    })),
  ];

  return (
    <section className="filter-panel" aria-label="Filtros de vagas">
      <div className="filter-row-main">
        <input type="search" className="search-input" placeholder="Buscar por título..." aria-label="Buscar por título" value={busca} onChange={(e) => aoMudarBusca(e.target.value)} />
        <select className="site-select" aria-label="Filtrar por site" value={fonte} onChange={(e) => aoMudarFonte(e.target.value as IdFonte | typeof TODAS)}>
          <option value={TODAS}>Todos os sites</option>
          {IDS_DAS_FONTES.map((id) => <option key={id} value={id}>{NOMES_DAS_FONTES[id]}</option>)}
        </select>
        <div className="segmented" role="group" aria-label="Período e vagas vistas">
          {SUBABAS.map(({ id, rotulo, dica }) => (
            <button key={id} type="button" title={dica} aria-pressed={subAba === id} className={subAba === id ? 'active' : ''} onClick={() => aoMudarSubAba(id)}>
              {rotulo}
            </button>
          ))}
        </div>
      </div>
      <div className="area-chips" role="group" aria-label="Filtrar por área">
        {areas.map(({ id, rotulo, total }) => (
          <button key={id} type="button" aria-pressed={categoria === id} className={`filter-pill${categoria === id ? ' active' : ''}`} onClick={() => aoMudarCategoria(id)}>
            {rotulo} <span className="chip-count">{total}</span>
          </button>
        ))}
      </div>
    </section>
  );
}
