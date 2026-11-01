import { useEffect, useState } from 'react';
import { CHAVE_DO_MODO, CHAVE_DO_TEMA, gravarItem, lerItem } from '../../infraestrutura/web/armazenamentoLocal';

type Modo = 'claro' | 'escuro';

function modoInicial(): Modo {
  const salvo = lerItem(CHAVE_DO_MODO);
  if (salvo === 'dark') return 'escuro';
  if (salvo === 'light') return 'claro';
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'escuro' : 'claro';
}

export function useTema() {
  const [tema, setTema] = useState(() => lerItem(CHAVE_DO_TEMA) ?? 'red');
  const [modo, setModo] = useState<Modo>(modoInicial);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', tema);
  }, [tema]);

  useEffect(() => {
    if (modo === 'escuro') document.documentElement.setAttribute('data-mode', 'dark');
    else document.documentElement.removeAttribute('data-mode');
  }, [modo]);

  const escolherTema = (novo: string) => {
    setTema(novo);
    gravarItem(CHAVE_DO_TEMA, novo);
  };

  const alternarModo = () => {
    const novo: Modo = modo === 'escuro' ? 'claro' : 'escuro';
    setModo(novo);
    gravarItem(CHAVE_DO_MODO, novo === 'escuro' ? 'dark' : 'light');
  };

  return { tema, modo, escolherTema, alternarModo };
}
