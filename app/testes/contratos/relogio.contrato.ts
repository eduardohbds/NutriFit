import type { Relogio } from '../../src/aplicacao/portas/relogio';

const ISO_UTC = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

export function contratoDoRelogio(nome: string, criar: () => Relogio) {
  describe(`contrato do Relogio: ${nome}`, () => {
    it('informa o instante em ISO 8601 UTC', () => {
      expect(criar().agora().iso).toMatch(ISO_UTC);
    });
  });
}
