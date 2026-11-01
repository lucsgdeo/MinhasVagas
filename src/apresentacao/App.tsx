import { useCallback, useEffect, useMemo, useState } from 'react';
import { calcularJanelaRecente, filtrarVagas, TODAS, type SubAba } from '../aplicacao/filtrarVagas';
import type { Categoria, IdFonte, UltimaExecucao, Vaga } from '../dominio/vaga';
import { catalogoHttp } from '../infraestrutura/web/catalogoHttp';
import { Cabecalho } from './componentes/Cabecalho';
import { CartaoDeVaga } from './componentes/CartaoDeVaga';
import { FiltrosDeVagas } from './componentes/FiltrosDeVagas';
import { GraficoDeHorarios } from './componentes/GraficoDeHorarios';
import { EstadoDeErro, EstadoVazio, Carregando } from './componentes/Estados';
import { PainelDeDescricao } from './componentes/PainelDeDescricao';
import { useVagasVistas } from './ganchos/useVagasVistas';

type Aba = 'vagas' | 'horarios';
type Estado = 'carregando' | 'pronto' | 'erro';

const ROTULOS_DAS_SUBABAS: Record<SubAba, string> = {
  recentes: 'hoje e ontem',
  'nao-vistas': 'ainda não vistas',
  todas: '',
};

function contagem(total: number, rotulo: string): string {
  const plural = total === 1 ? '' : 's';
  const base = `${total} vaga${plural} encontrada${plural}`;
  return rotulo ? `${base} · ${rotulo}` : base;
}

export function App() {
  const [vagas, setVagas] = useState<Vaga[]>([]);
  const [ultimaExecucao, setUltimaExecucao] = useState<UltimaExecucao | null>(null);
  const [estado, setEstado] = useState<Estado>('carregando');
  const [erro, setErro] = useState('');
  const [aba, setAba] = useState<Aba>('vagas');
  const [subAba, setSubAba] = useState<SubAba>('recentes');
  const [categoria, setCategoria] = useState<Categoria | typeof TODAS>('Suporte');
  const [fonte, setFonte] = useState<IdFonte | typeof TODAS>(TODAS);
  const [busca, setBusca] = useState('');
  const [vagaAberta, setVagaAberta] = useState<Vaga | null>(null);
  const [janelaRecente] = useState(() => calcularJanelaRecente(Date.now()));
  const { vistas, vistasNoCarregamento, alternar } = useVagasVistas();

  const carregar = useCallback(async () => {
    setEstado('carregando');
    try {
      const [lista, execucao] = await Promise.all([catalogoHttp.listarVagas(), catalogoHttp.ultimaExecucao()]);
      setVagas(lista);
      setUltimaExecucao(execucao);
      setEstado('pronto');
    } catch (causa) {
      setErro(`Não foi possível carregar as vagas: ${String(causa)}`);
      setEstado('erro');
    }
  }, []);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  const filtradas = useMemo(
    () => filtrarVagas(vagas, { categoria, fonte, busca, subAba, vistasNoCarregamento, janelaRecente }),
    [vagas, categoria, fonte, busca, subAba, vistasNoCarregamento, janelaRecente],
  );

  return (
    <>
      <div className="container">
        <Cabecalho ultimaExecucao={ultimaExecucao} />

        <div className="tabs" role="tablist">
          <button type="button" role="tab" aria-selected={aba === 'vagas'} className={`tab-btn${aba === 'vagas' ? ' active' : ''}`} onClick={() => setAba('vagas')}>
            Vagas
          </button>
          <button type="button" role="tab" aria-selected={aba === 'horarios'} className={`tab-btn${aba === 'horarios' ? ' active' : ''}`} onClick={() => setAba('horarios')}>
            Horários de Postagem
          </button>
        </div>

        {estado === 'carregando' && <Carregando />}
        {estado === 'erro' && <EstadoDeErro mensagem={erro} aoTentarDeNovo={() => void carregar()} />}

        {estado === 'pronto' && aba === 'horarios' && <GraficoDeHorarios vagas={vagas} />}

        {estado === 'pronto' && aba === 'vagas' && (
          <>
            <FiltrosDeVagas
              subAba={subAba}
              categoria={categoria}
              fonte={fonte}
              busca={busca}
              aoMudarSubAba={setSubAba}
              aoMudarCategoria={setCategoria}
              aoMudarFonte={setFonte}
              aoMudarBusca={setBusca}
            />
            {filtradas.length === 0 ? (
              <EstadoVazio subAba={subAba} />
            ) : (
              <>
                <div className="stats">
                  <span>{contagem(filtradas.length, ROTULOS_DAS_SUBABAS[subAba])}</span>
                </div>
                <div className="vacancies-grid">
                  {filtradas.map((vaga) => (
                    <CartaoDeVaga
                      key={vaga.id}
                      vaga={vaga}
                      vista={vistas.has(vaga.id)}
                      aoAlternarVista={(marcada) => alternar(vaga.id, marcada)}
                      aoAbrirDescricao={() => setVagaAberta(vaga)}
                    />
                  ))}
                </div>
              </>
            )}
          </>
        )}
      </div>

      {vagaAberta && <PainelDeDescricao vaga={vagaAberta} aoFechar={() => setVagaAberta(null)} />}
    </>
  );
}
