import { Carga } from '../../src/dominio/carga';
import { ErroDeValidacao } from '../../src/dominio/erro-de-validacao';

describe('Carga em gramas inteiros (arquitetura 7.1)', () => {
  it('guarda 22,5 kg como exatamente 22 500 g', () => {
    expect(Carga.deQuilos(22.5).gramas).toBe(22500);
  });

  it('mantém 22 500 g depois de mil idas e voltas entre kg e lb', () => {
    const original = Carga.deQuilos(22.5);
    let carga = original;
    for (let i = 0; i < 1000; i++) {
      carga = Carga.deQuilos(Carga.deLibras(carga.emLibras()).emQuilos());
    }
    expect(carga.gramas).toBe(22500);
    expect(carga.igual(original)).toBe(true);
  });

  it('exibe em libras com 1 kg = 2,20462 lb sem mudar os gramas (seção 13.7)', () => {
    const carga = Carga.deQuilos(22.5);
    expect(carga.emLibras()).toBeCloseTo(49.60395, 5);
    expect(carga.gramas).toBe(22500);
  });

  it('distingue cargas diferentes por um grama', () => {
    expect(Carga.deGramas(22500).igual(Carga.deGramas(22501))).toBe(false);
  });

  it.each([[-1], [0.5], [Number.NaN], [Number.POSITIVE_INFINITY]])(
    'recusa %p gramas, dizendo o formato esperado',
    (gramas) => {
      expect(() => Carga.deGramas(gramas)).toThrow(ErroDeValidacao);
      expect(() => Carga.deGramas(gramas)).toThrow(/carga: esperado inteiro de gramas ≥ 0/);
    },
  );
});
