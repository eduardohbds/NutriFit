import { ErroDeValidacao } from '../dominio/erro-de-validacao';
import type { Ficha } from '../dominio/ficha';
import type { Identificador } from '../dominio/identificador';
import type { RepositorioDeFichas } from './portas/repositorio-de-fichas';

// A ficha pelo identificador, ou ErroDeValidacao dizendo o valor recebido (nada é alterado).
export async function fichaExistente(
  fichas: RepositorioDeFichas,
  fichaId: Identificador,
): Promise<Ficha> {
  const ficha = (await fichas.listarFichas()).find((f) => f.id.valor === fichaId.valor);
  if (!ficha) throw new ErroDeValidacao('ficha', 'ficha existente', fichaId.valor);
  return ficha;
}
