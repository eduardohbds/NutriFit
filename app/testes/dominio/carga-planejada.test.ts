import { lerCargaEmQuilos } from '../../src/dominio/carga-planejada';
import { ErroDeValidacao } from '../../src/dominio/erro-de-validacao';

describe('lerCargaEmQuilos (seção 11.2)', () => {
  it.each([
    ['60', 60],
    ['62,5', 62.5],
    ['62.5', 62.5],
    ['0', 0],
    [' 12 ', 12],
  ])('lê %s como %d kg', (texto, quilos) => {
    expect(lerCargaEmQuilos(texto)).toBe(quilos);
  });

  it.each(['', null])('trata %p como carga em branco', (texto) => {
    expect(lerCargaEmQuilos(texto)).toBeNull();
  });

  it.each(['abc', '-1', '1,2,3', '10kg'])('recusa %s com o valor recebido', (texto) => {
    const erro = (() => {
      try {
        lerCargaEmQuilos(texto);
      } catch (e) {
        return e;
      }
    })();

    expect(erro).toBeInstanceOf(ErroDeValidacao);
    expect((erro as ErroDeValidacao).campo).toBe('carga');
    expect((erro as ErroDeValidacao).recebido).toBe(texto);
  });
});
