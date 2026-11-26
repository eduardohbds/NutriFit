import { ErroDeValidacao } from '../../src/dominio/erro-de-validacao';
import { Rir } from '../../src/dominio/rir';

function erroDe(construir: () => unknown): ErroDeValidacao {
  try {
    construir();
  } catch (erro) {
    return erro as ErroDeValidacao;
  }
  throw new Error('esperava um erro e nada foi lançado');
}

describe('Rir (RB09, AGENTS.md seção 5)', () => {
  it.each([0, 1, 2, 3, 4, 5])('constrói com %i', (valor) => {
    expect(Rir.de(valor).valor).toBe(valor);
  });

  it.each([-1, 6, 10, 2.5, Number.NaN, Number.POSITIVE_INFINITY])(
    'não constrói com %p, e o erro diz o valor recebido e o formato esperado',
    (valor) => {
      const erro = erroDe(() => Rir.de(valor));

      expect(erro).toBeInstanceOf(ErroDeValidacao);
      expect(erro).toMatchObject({ campo: 'rir', recebido: valor });
      expect(erro.esperado).toBe('inteiro de 0 a 5');
    },
  );

  it.each([
    ['2', 2],
    [' 3 ', 3],
    ['0', 0],
    ['5', 5],
  ])('lê o texto "%s" como RIR %i', (texto, valor) => {
    expect(Rir.deTexto(texto).valor).toBe(valor);
  });

  it.each(['', '  ', 'abc', '-1', '6', '2,5', '2.5', '1e1', '2x'])(
    'recusa o texto "%s" com o texto recebido',
    (texto) => {
      const erro = erroDe(() => Rir.deTexto(texto));

      expect(erro).toBeInstanceOf(ErroDeValidacao);
      expect(erro).toMatchObject({ campo: 'rir', recebido: texto });
      expect(erro.esperado).toBe('inteiro de 0 a 5');
    },
  );

  it('o 5 guarda cinco ou mais, e continua valendo 5', () => {
    expect(Rir.de(5).valor).toBe(5);
  });
});
