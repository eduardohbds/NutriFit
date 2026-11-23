import { ErroDeValidacao } from '../../src/dominio/erro-de-validacao';
import { exigirFichaComRotinas } from '../../src/dominio/rotina-com-linhas';

describe('exigirFichaComRotinas (US-007d3)', () => {
  it('aceita a ficha com ao menos uma rotina', () => {
    expect(() => exigirFichaComRotinas([{}])).not.toThrow();
    expect(() => exigirFichaComRotinas([{}, {}])).not.toThrow();
  });

  it('recusa a ficha sem nenhuma rotina, dizendo o valor recebido e o formato esperado', () => {
    const erro = (() => {
      try {
        exigirFichaComRotinas([]);
      } catch (e) {
        return e;
      }
    })();

    expect(erro).toBeInstanceOf(ErroDeValidacao);
    expect((erro as ErroDeValidacao).campo).toBe('rotinas');
    expect((erro as ErroDeValidacao).recebido).toBe('0 rotinas');
    expect((erro as ErroDeValidacao).esperado).toBe('ao menos 1 rotina');
  });
});
