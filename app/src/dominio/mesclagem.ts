import { ErroDeValidacao } from './erro-de-validacao';
import type { Identificador } from './identificador';

export interface ExercicioNaMesclagem {
  id: Identificador;
  jaMesclado: boolean;
}

// Regras do pedido de mesclagem que não dependem de onde os exercícios estão guardados (US-006a).
export function exigirIdentificadoresDiferentes(
  mantidoId: Identificador,
  descartadoId: Identificador,
): void {
  if (mantidoId.valor === descartadoId.valor)
    throw new ErroDeValidacao('descartadoId', 'exercício diferente do mantido', descartadoId.valor);
}

// Sem cadeia: quem já foi mesclado não recebe nem é recebido por outro, para o vínculo apontar
// sempre direto ao mantido.
export function exigirSemMesclagemPrevia(
  mantido: ExercicioNaMesclagem,
  descartado: ExercicioNaMesclagem,
): void {
  if (mantido.jaMesclado)
    throw new ErroDeValidacao('mantidoId', 'exercício ainda não mesclado', mantido.id.valor);
  if (descartado.jaMesclado)
    throw new ErroDeValidacao('descartadoId', 'exercício ainda não mesclado', descartado.id.valor);
}
