import type { GeradorDeIdentificador } from '../../src/aplicacao/portas/gerador-de-identificador';

const UUID_V7 = /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

export function contratoDoGeradorDeIdentificador(
  nome: string,
  criar: () => GeradorDeIdentificador,
) {
  describe(`contrato do GeradorDeIdentificador: ${nome}`, () => {
    it('gera identificador no formato UUID v7', () => {
      expect(criar().gerar().valor).toMatch(UUID_V7);
    });

    it('gera identificadores distintos e em ordem crescente', () => {
      const gerador = criar();
      const valores = Array.from({ length: 100 }, () => gerador.gerar().valor);
      expect(new Set(valores).size).toBe(100);
      expect([...valores].sort()).toEqual(valores);
    });
  });
}
