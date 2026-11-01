import { useCallback, useState } from 'react';
import { gravarVagasVistas, lerVagasVistas } from '../../infraestrutura/web/armazenamentoLocal';

export function useVagasVistas() {
  const [vistas, setVistas] = useState<ReadonlySet<string>>(lerVagasVistas);
  // Instantâneo proposital: a vaga marcada só sai das listas ao recarregar a página.
  const [vistasNoCarregamento] = useState(vistas);

  const alternar = useCallback((id: string, marcada: boolean) => {
    setVistas((atuais) => {
      const proximas = new Set(atuais);
      if (marcada) proximas.add(id);
      else proximas.delete(id);
      gravarVagasVistas(proximas);
      return proximas;
    });
  }, []);

  return { vistas, vistasNoCarregamento, alternar };
}
