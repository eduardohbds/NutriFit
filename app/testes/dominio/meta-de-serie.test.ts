import { ErroDeValidacao } from '../../src/dominio/erro-de-validacao';
import { MetaDeSerie } from '../../src/dominio/meta-de-serie';

describe('MetaDeSerie.deTexto (seção 11.2)', () => {
  it.each([
    ['10', { tipo: 'repeticoes', minimo: 10, maximo: null, segundos: null }],
    ['8-12', { tipo: 'faixa', minimo: 8, maximo: 12, segundos: null }],
    ['falha', { tipo: 'falha', minimo: null, maximo: null, segundos: null }],
    ['  FALHA ', { tipo: 'falha', minimo: null, maximo: null, segundos: null }],
    ['60s', { tipo: 'tempo', minimo: null, maximo: null, segundos: 60 }],
    ['30min', { tipo: 'tempo', minimo: null, maximo: null, segundos: 1800 }],
  ])('lê %s', (texto, esperado) => {
    expect(MetaDeSerie.deTexto(texto)).toMatchObject(esperado);
  });

  it.each(['', 'abc', '0', '12-8', '8-8', '1,5', '0s', '10x'])('recusa "%s"', (texto) => {
    const erro = (() => {
      try {
        MetaDeSerie.deTexto(texto);
      } catch (e) {
        return e;
      }
      return undefined;
    })();

    expect(erro).toBeInstanceOf(ErroDeValidacao);
    expect(erro).toMatchObject({ campo: 'meta', recebido: texto });
    expect((erro as ErroDeValidacao).esperado).toMatch(/repetições \(10\)/);
  });
});
