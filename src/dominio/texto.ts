/** Minúsculas e sem acento: é a forma em que todos os filtros comparam títulos. */
export function semAcento(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();
}

export function espacosNormalizados(texto: string): string {
  return texto.replace(/\s+/g, ' ').trim();
}
