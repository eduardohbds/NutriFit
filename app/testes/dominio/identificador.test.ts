import { ErroDeValidacao } from '../../src/dominio/erro-de-validacao';
import { Identificador } from '../../src/dominio/identificador';

describe('Identificador UUID v7', () => {
  it('aceita um UUID v7', () => {
    const valor = '019a6f1e-4b2c-7d3e-8f40-123456789abc';
    expect(Identificador.de(valor).valor).toBe(valor);
  });

  it.each([
    ['UUID v4', '3f2b6c1e-4b2c-4d3e-8f40-123456789abc'],
    ['variante errada', '019a6f1e-4b2c-7d3e-cf40-123456789abc'],
    ['maiúsculas', '019A6F1E-4B2C-7D3E-8F40-123456789ABC'],
    ['texto qualquer', 'ficha-1'],
  ])('recusa %s', (_, valor) => {
    expect(() => Identificador.de(valor)).toThrow(ErroDeValidacao);
  });
});
