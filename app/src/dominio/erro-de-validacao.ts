// Valor inválido não se constrói: o erro leva campo, formato esperado e valor recebido,
// para a tela mostrar os dois; o registro de falhas guarda só campo e esperado (SEG13).
export class ErroDeValidacao extends Error {
  constructor(
    readonly campo: string,
    readonly esperado: string,
    readonly recebido: unknown,
  ) {
    super(`${campo}: esperado ${esperado}, recebido ${String(recebido)}`);
    this.name = 'ErroDeValidacao';
  }
}
