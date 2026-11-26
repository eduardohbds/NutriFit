import { ErroDeValidacao } from './erro-de-validacao';

const ESPERADO = 'inteiro de 0 a 5';
const TEXTO_VALIDO = /^[0-5]$/;

// Repetições em reserva (RB09): inteiro de 0 a 5, em que 5 significa cinco ou mais e fica
// guardado como 5. Valor fora disso não se constrói.
export class Rir {
  private constructor(readonly valor: number) {}

  static de(valor: number): Rir {
    if (!Number.isInteger(valor) || valor < 0 || valor > 5) {
      throw new ErroDeValidacao('rir', ESPERADO, valor);
    }
    return new Rir(valor);
  }

  // O texto digitado na tela; o erro devolve o texto como veio, para a mensagem mostrá-lo.
  static deTexto(texto: string): Rir {
    const limpo = texto.trim();
    if (!TEXTO_VALIDO.test(limpo)) throw new ErroDeValidacao('rir', ESPERADO, texto);
    return new Rir(Number(limpo));
  }
}
