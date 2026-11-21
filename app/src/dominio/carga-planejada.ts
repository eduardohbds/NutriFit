import { ErroDeValidacao } from './erro-de-validacao';

const NUMERO = /^\d+([.,]\d+)?$/;

// Carga planejada em quilos (seção 11.2), com vírgula ou ponto decimal. Vazio é carga em branco:
// peso corporal ou carga ainda não definida.
export function lerCargaEmQuilos(texto: string | null): number | null {
  const limpo = texto?.trim() ?? '';
  if (limpo === '') return null;
  if (!NUMERO.test(limpo)) {
    throw new ErroDeValidacao('carga', 'número maior ou igual a 0, como 60 ou 62,5', texto);
  }
  return Number(limpo.replace(',', '.'));
}
