import { NOMES_DAS_FONTES, type UltimaExecucao } from '../../dominio/vaga';
import { useTema } from '../ganchos/useTema';
import { BotaoDePesquisa } from './BotaoDePesquisa';

const TEMAS = [
  { id: 'red', nome: 'Vermelho', cor: '#dc2626' },
  { id: 'blue', nome: 'Azul', cor: '#2563eb' },
  { id: 'green', nome: 'Verde', cor: '#16a34a' },
  { id: 'purple', nome: 'Roxo', cor: '#9333ea' },
  { id: 'orange', nome: 'Laranja', cor: '#ea580c' },
  { id: 'teal', nome: 'Verde-azulado', cor: '#0d9488' },
  { id: 'indigo', nome: 'Índigo', cor: '#4f46e5' },
  { id: 'pink', nome: 'Rosa', cor: '#db2777' },
];

function resumoDaExecucao(execucao: UltimaExecucao | null): string {
  if (!execucao) return 'Vagas de tecnologia dos principais sites de emprego';
  const quando = new Date(execucao.executadaEm).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
  const comFalha = execucao.resultados
    .filter(({ consultasComErro }) => consultasComErro > 0)
    .map(({ fonte }) => NOMES_DAS_FONTES[fonte]);
  return comFalha.length
    ? `Última pesquisa: ${quando} · resultado incompleto de ${comFalha.join(', ')}`
    : `Última pesquisa: ${quando}`;
}

export function Cabecalho({ ultimaExecucao }: { ultimaExecucao: UltimaExecucao | null }) {
  const { tema, modo, escolherTema, alternarModo } = useTema();
  const rotuloDoModo = modo === 'escuro' ? 'Ativar modo claro' : 'Ativar modo escuro';

  return (
    <header className="header">
      <div className="header-left">
        <h1 className="title">MinhasVagas</h1>
        <p className="subtitle">{resumoDaExecucao(ultimaExecucao)}</p>
      </div>
      <div className="header-actions">
        <BotaoDePesquisa />
        <div className="theme-selector" role="group" aria-label="Selecionar tema de cor">
          <span className="theme-selector-label">Tema:</span>
          <div className="theme-options">
            {TEMAS.map(({ id, nome, cor }) => (
              <button
                key={id}
                type="button"
                className={`theme-option${tema === id ? ' active' : ''}`}
                style={{ background: cor }}
                aria-label={nome}
                title={nome}
                onClick={() => escolherTema(id)}
              />
            ))}
          </div>
          <div className="theme-divider" aria-hidden="true" />
          <button type="button" className="mode-toggle" aria-label={rotuloDoModo} title={rotuloDoModo} onClick={alternarModo}>
            {modo === 'escuro' ? '☀️' : '🌙'}
          </button>
        </div>
      </div>
    </header>
  );
}
