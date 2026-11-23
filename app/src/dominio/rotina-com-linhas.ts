import { ErroDeValidacao } from './erro-de-validacao';

// Uma rotina sem nenhuma linha não tem treino: o salvamento é bloqueado, indicando a primeira.
export function exigirRotinasComLinhas(rotinas: { nome: string; itens: unknown[] }[]): void {
  const vazia = rotinas.find((rotina) => rotina.itens.length === 0);
  if (!vazia) return;
  throw new ErroDeValidacao(`rotina "${vazia.nome}"`, 'ao menos 1 linha', '0 linhas');
}

// Uma ficha sem nenhuma rotina não tem treino: o salvamento é bloqueado.
export function exigirFichaComRotinas(rotinas: unknown[]): void {
  if (rotinas.length > 0) return;
  throw new ErroDeValidacao('rotinas', 'ao menos 1 rotina', '0 rotinas');
}
