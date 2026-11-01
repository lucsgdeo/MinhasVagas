import { TODAS, type SubAba } from '../../aplicacao/filtrarVagas';
import { CATEGORIAS, NOMES_DAS_FONTES, type Categoria, type IdFonte } from '../../dominio/vaga';

const SUBABAS: { id: SubAba; rotulo: string; dica?: string }[] = [
  { id: 'recentes', rotulo: 'Últimos 2 dias', dica: 'Vagas publicadas hoje ou ontem que você ainda não marcou como vistas' },
  { id: 'nao-vistas', rotulo: 'Não Vistas', dica: 'Todas as vagas que você ainda não marcou como vistas, sem limite de data' },
  { id: 'todas', rotulo: 'Todas' },
];

const ROTULOS_DAS_CATEGORIAS: Record<Categoria, string> = {
  Suporte: 'Suporte',
  Estágio: 'Estágio',
  Desenvolvimento: 'Dev',
  TI: 'TI',
  Outras: 'Outras',
};

const IDS_DAS_FONTES = Object.keys(NOMES_DAS_FONTES) as IdFonte[];

interface Propriedades {
  subAba: SubAba;
  categoria: Categoria | typeof TODAS;
  fonte: IdFonte | typeof TODAS;
  busca: string;
  aoMudarSubAba: (subAba: SubAba) => void;
  aoMudarCategoria: (categoria: Categoria | typeof TODAS) => void;
  aoMudarFonte: (fonte: IdFonte | typeof TODAS) => void;
  aoMudarBusca: (busca: string) => void;
}

export function FiltrosDeVagas(props: Propriedades) {
  const { subAba, categoria, fonte, busca, aoMudarSubAba, aoMudarCategoria, aoMudarFonte, aoMudarBusca } = props;

  return (
    <>
      <div className="subtabs" role="tablist" aria-label="Filtro de período e candidaturas">
        {SUBABAS.map(({ id, rotulo, dica }) => (
          <button key={id} type="button" role="tab" title={dica} aria-selected={subAba === id} className={`subtab-btn${subAba === id ? ' active' : ''}`} onClick={() => aoMudarSubAba(id)}>
            {rotulo}
          </button>
        ))}
      </div>
      <div className="filters">
        <input type="text" className="search-input" placeholder="Buscar por título..." aria-label="Buscar por título" value={busca} onChange={(e) => aoMudarBusca(e.target.value)} />
        <div className="filter-pills">
          {CATEGORIAS.map((opcao) => (
            <button key={opcao} type="button" aria-pressed={categoria === opcao} className={`filter-pill${categoria === opcao ? ' active' : ''}`} onClick={() => aoMudarCategoria(opcao)}>
              {ROTULOS_DAS_CATEGORIAS[opcao]}
            </button>
          ))}
          <button type="button" aria-pressed={categoria === TODAS} className={`filter-pill${categoria === TODAS ? ' active' : ''}`} onClick={() => aoMudarCategoria(TODAS)}>
            Todas
          </button>
        </div>
        <div className="filter-pills" role="group" aria-label="Filtrar por site">
          <button type="button" aria-pressed={fonte === TODAS} className={`filter-pill${fonte === TODAS ? ' active' : ''}`} onClick={() => aoMudarFonte(TODAS)}>
            Todos os sites
          </button>
          {IDS_DAS_FONTES.map((id) => (
            <button key={id} type="button" aria-pressed={fonte === id} className={`filter-pill${fonte === id ? ' active' : ''}`} onClick={() => aoMudarFonte(id)}>
              {NOMES_DAS_FONTES[id]}
            </button>
          ))}
        </div>
      </div>
    </>
  );
}
