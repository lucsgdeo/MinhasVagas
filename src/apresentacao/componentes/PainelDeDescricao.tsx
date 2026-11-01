import { useEffect, useRef, useState } from 'react';
import type { BlocoDeDescricao, MapaDeDescricoes, SecaoDeDescricao, Vaga } from '../../dominio/vaga';
import { catalogoHttp } from '../../infraestrutura/web/catalogoHttp';
import { dataEHora, modalidade } from '../formatacao';

// O arquivo é grande e só é baixado no primeiro uso; se falhar, a próxima abertura tenta de novo.
let descricoesEmCache: Promise<MapaDeDescricoes> | null = null;

function carregarDescricoes(): Promise<MapaDeDescricoes> {
  descricoesEmCache ??= catalogoHttp.listarDescricoes().catch((erro: unknown) => {
    descricoesEmCache = null;
    throw erro;
  });
  return descricoesEmCache;
}

type Conteudo = { estado: 'carregando' } | { estado: 'erro' } | { estado: 'pronto'; secoes: SecaoDeDescricao[] };

/** Itens vizinhos formam uma única lista; subtítulos e parágrafos ficam entre elas. */
function Blocos({ blocos }: { blocos: BlocoDeDescricao[] }) {
  const grupos: (BlocoDeDescricao | string[])[] = [];
  for (const bloco of blocos) {
    if (bloco.tipo !== 'item') {
      grupos.push(bloco);
      continue;
    }
    const ultimo = grupos.at(-1);
    if (Array.isArray(ultimo)) ultimo.push(bloco.texto);
    else grupos.push([bloco.texto]);
  }

  return grupos.map((grupo, indice) => {
    if (Array.isArray(grupo)) {
      return (
        <ul key={indice} className="desc-list">
          {grupo.map((item, posicao) => <li key={posicao}>{item}</li>)}
        </ul>
      );
    }
    return grupo.tipo === 'subtitulo'
      ? <h4 key={indice} className="desc-subtitle">{grupo.texto}</h4>
      : <p key={indice} className="desc-text">{grupo.texto}</p>;
  });
}

export function PainelDeDescricao({ vaga, aoFechar }: { vaga: Vaga; aoFechar: () => void }) {
  const [conteudo, setConteudo] = useState<Conteudo>({ estado: 'carregando' });
  const botaoFechar = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    let ativo = true;
    carregarDescricoes()
      .then((descricoes) => {
        if (ativo) setConteudo({ estado: 'pronto', secoes: descricoes[vaga.id]?.secoes ?? [] });
      })
      .catch(() => {
        if (ativo) setConteudo({ estado: 'erro' });
      });
    return () => {
      ativo = false;
    };
  }, [vaga.id]);

  useEffect(() => {
    const focoAnterior = document.activeElement as HTMLElement | null;
    botaoFechar.current?.focus();
    document.body.classList.add('drawer-open');
    const aoTeclar = (evento: KeyboardEvent) => {
      if (evento.key === 'Escape') aoFechar();
    };
    document.addEventListener('keydown', aoTeclar);
    return () => {
      document.removeEventListener('keydown', aoTeclar);
      document.body.classList.remove('drawer-open');
      focoAnterior?.focus();
    };
  }, [aoFechar]);

  const subtitulo = [vaga.empresa, modalidade(vaga), dataEHora(vaga)].filter(Boolean).join(' · ');

  return (
    <>
      <div className="desc-backdrop open" aria-hidden="true" onClick={aoFechar} />
      <aside className="desc-drawer open" role="dialog" aria-modal="true" aria-labelledby="titulo-da-descricao">
        <header className="desc-drawer-header">
          <div className="desc-drawer-headings">
            <h2 id="titulo-da-descricao" className="desc-drawer-title">{vaga.titulo || 'Sem título'}</h2>
            <p className="desc-drawer-subtitle">{subtitulo}</p>
          </div>
          <button ref={botaoFechar} type="button" className="desc-drawer-close" aria-label="Fechar descrição" onClick={aoFechar}>✕</button>
        </header>
        <div className="desc-drawer-body">
          {conteudo.estado === 'carregando' && <p className="desc-status">Carregando descrição…</p>}
          {conteudo.estado === 'erro' && (
            <p className="desc-status">Não foi possível carregar a descrição agora. Tente novamente em alguns instantes.</p>
          )}
          {conteudo.estado === 'pronto' && conteudo.secoes.length === 0 && (
            <p className="desc-status">A descrição desta vaga está disponível só no site original — use o botão abaixo.</p>
          )}
          {conteudo.estado === 'pronto' && conteudo.secoes.map((secao, indice) => (
            <section key={indice} className="desc-section">
              <h3 className="desc-section-title">{secao.titulo || 'Descrição'}</h3>
              <Blocos blocos={secao.blocos} />
            </section>
          ))}
        </div>
        <footer className="desc-drawer-footer">
          <a className="apply-btn" href={vaga.url} target="_blank" rel="noopener noreferrer">Candidatar-se →</a>
        </footer>
      </aside>
    </>
  );
}
