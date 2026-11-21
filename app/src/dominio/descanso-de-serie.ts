import { ErroDeValidacao } from './erro-de-validacao';

const SEGUNDOS = /^(\d+)$/;
const MINUTOS_E_SEGUNDOS = /^(\d+):([0-5]\d)$/;
const ESPERADO = 'segundos (90) ou minutos e segundos (1:30)';

// Descanso após a série (seção 11.2), em segundos. Vazio é descanso não informado.
export function lerDescanso(texto: string | null): number | null {
  const limpo = texto?.trim() ?? '';
  if (limpo === '') return null;
  const segundos = SEGUNDOS.exec(limpo);
  if (segundos) return Number(segundos[1]);
  const composto = MINUTOS_E_SEGUNDOS.exec(limpo);
  if (composto) return Number(composto[1]) * 60 + Number(composto[2]);
  throw new ErroDeValidacao('descanso', ESPERADO, texto);
}
