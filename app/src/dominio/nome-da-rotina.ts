import { ErroDeValidacao } from './erro-de-validacao';

// O nome da rotina é aparado e não pode ficar em branco; o erro indica a rotina pela posição
// (a partir de 1), porque o nome é justamente o que está errado.
export function nomeDaRotina(nome: string, posicao: number): string {
  const aparado = nome.trim();
  if (aparado === '') {
    throw new ErroDeValidacao(`rotina ${posicao}: nome`, 'texto com ao menos 1 caractere', nome);
  }
  return aparado;
}
