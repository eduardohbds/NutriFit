import type { InstanteUtc } from '../dominio/instante-utc';

const doisDigitos = (numero: number): string => String(numero).padStart(2, '0');

// Data e hora no fuso do aparelho, como o usuário lê: 10/11/2026 13:45.
export function formatarDataEHora(instante: InstanteUtc): string {
  const data = new Date(instante.iso);
  const dia = `${doisDigitos(data.getDate())}/${doisDigitos(data.getMonth() + 1)}/${data.getFullYear()}`;
  return `${dia} ${doisDigitos(data.getHours())}:${doisDigitos(data.getMinutes())}`;
}
