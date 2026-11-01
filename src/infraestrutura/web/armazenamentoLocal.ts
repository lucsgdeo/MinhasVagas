const CHAVE_DAS_VISTAS = 'minhasvagas_applied';
export const CHAVE_DO_TEMA = 'minhasvagas_theme';
export const CHAVE_DO_MODO = 'minhasvagas_mode';

// O armazenamento pode estar bloqueado (janela privada, política do navegador):
// o site continua funcionando, só não lembra as escolhas.
export function lerItem(chave: string): string | null {
  try {
    return localStorage.getItem(chave);
  } catch {
    return null;
  }
}

export function gravarItem(chave: string, valor: string): void {
  try {
    localStorage.setItem(chave, valor);
  } catch {
    // Ver o comentário em `lerItem`.
  }
}

/** Marcações antigas guardam só o número da vaga, de quando a Gupy era a única fonte. */
function idComFonte(id: unknown): string {
  const texto = String(id);
  return /^\d+$/.test(texto) ? `gupy-${texto}` : texto;
}

export function lerVagasVistas(): Set<string> {
  try {
    const ids: unknown = JSON.parse(lerItem(CHAVE_DAS_VISTAS) ?? '[]');
    return new Set(Array.isArray(ids) ? ids.map(idComFonte) : []);
  } catch {
    return new Set();
  }
}

export function gravarVagasVistas(ids: ReadonlySet<string>): void {
  gravarItem(CHAVE_DAS_VISTAS, JSON.stringify([...ids]));
}
