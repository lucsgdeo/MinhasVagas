import type { Vaga } from '../dominio/vaga';

export function dataEHora(vaga: Vaga): string {
  const data = new Date(vaga.publicadaEm);
  if (Number.isNaN(data.getTime())) return 'N/I';
  const dia = data.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit' });
  if (vaga.dataEstimada) return `Vista em ${dia}`;
  const hora = data.toLocaleString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  return `${dia} · ${hora}`;
}

export function modalidade(vaga: Vaga): string {
  return vaga.remota ? 'Remoto' : 'Presencial';
}
