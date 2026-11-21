import { lerDescanso } from '../../src/dominio/descanso-de-serie';
import { ErroDeValidacao } from '../../src/dominio/erro-de-validacao';

describe('lerDescanso (seção 11.2)', () => {
  it.each([
    ['90', 90],
    ['0', 0],
    ['1:30', 90],
    ['2:00', 120],
    ['0:45', 45],
    [' 60 ', 60],
  ])('lê %s como %i segundos', (texto, segundos) => {
    expect(lerDescanso(texto)).toBe(segundos);
  });

  it.each(['', null])('trata %p como descanso não informado', (texto) => {
    expect(lerDescanso(texto)).toBeNull();
  });

  it.each(['abc', '-5', '1,5', '1:60', '1:3', '90s', '-'])(
    'recusa %s dizendo o valor recebido e o formato esperado',
    (texto) => {
      const erro = (() => {
        try {
          lerDescanso(texto);
        } catch (e) {
          return e;
        }
      })();

      expect(erro).toBeInstanceOf(ErroDeValidacao);
      expect((erro as ErroDeValidacao).campo).toBe('descanso');
      expect((erro as ErroDeValidacao).esperado).toMatch(/segundos \(90\)/);
      expect((erro as ErroDeValidacao).recebido).toBe(texto);
    },
  );
});
