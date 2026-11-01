const FUSO_BRASILIA = '-03:00';

/** Data sem hora, ao meio-dia de Brasília: não muda de dia ao ser exibida em outro fuso. */
function meioDiaEmBrasilia(ano: number, mes: number, dia: number): string {
  const doisDigitos = (numero: number) => String(numero).padStart(2, '0');
  return new Date(`${ano}-${doisDigitos(mes)}-${doisDigitos(dia)}T12:00:00${FUSO_BRASILIA}`).toISOString();
}

/** "14/10/2026" → ISO. Aceita também "Hoje" e "Ontem". */
export function dataBrasileiraParaIso(texto: string, agora: Date): string | null {
  const limpo = texto.trim().toLowerCase();
  if (limpo.includes('hoje')) return agora.toISOString();
  if (limpo.includes('ontem')) return new Date(agora.getTime() - 86_400_000).toISOString();

  const partes = limpo.match(/(\d{2})\/(\d{2})\/(\d{4})/);
  if (!partes) return null;
  return meioDiaEmBrasilia(Number(partes[3]), Number(partes[2]), Number(partes[1]));
}

/** "Publicada em 29/10" → ISO. Sem ano na origem: data no futuro é do ano anterior. */
export function diaMesParaIso(texto: string, agora: Date): string | null {
  const partes = texto.match(/(\d{2})\/(\d{2})(?!\/)/);
  if (!partes) return null;
  const [dia, mes] = [Number(partes[1]), Number(partes[2])];
  const noAnoAtual = meioDiaEmBrasilia(agora.getUTCFullYear(), mes, dia);
  return Date.parse(noAnoAtual) > agora.getTime() + 86_400_000
    ? meioDiaEmBrasilia(agora.getUTCFullYear() - 1, mes, dia)
    : noAnoAtual;
}

/** "2026/10/30 02:19:00" (horário de Brasília) → ISO. */
export function dataHoraComBarrasParaIso(texto: string): string | null {
  const partes = texto.match(/(\d{4})\/(\d{2})\/(\d{2}) (\d{2}:\d{2}:\d{2})/);
  if (!partes) return null;
  const momento = new Date(`${partes[1]}-${partes[2]}-${partes[3]}T${partes[4]}${FUSO_BRASILIA}`);
  return Number.isNaN(momento.getTime()) ? null : momento.toISOString();
}
