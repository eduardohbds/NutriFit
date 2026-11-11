import { ErroDeValidacao } from './erro-de-validacao';

const UUID_V7 = /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

// Identificador UUID v7 gerado no aparelho: ordenável no tempo e sem colisão com a web futura.
export class Identificador {
  private constructor(readonly valor: string) {}

  static de(valor: string): Identificador {
    if (!UUID_V7.test(valor)) {
      throw new ErroDeValidacao('identificador', 'UUID v7 em minúsculas', valor);
    }
    return new Identificador(valor);
  }
}
