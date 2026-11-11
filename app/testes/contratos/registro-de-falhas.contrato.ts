import type { RegistroDeFalhas } from '../../src/aplicacao/portas/registro-de-falhas';
import { EventoDeFalha } from '../../src/dominio/evento-de-falha';
import { InstanteUtc } from '../../src/dominio/instante-utc';

const evento = (codigo: string) =>
  EventoDeFalha.criar({
    quando: InstanteUtc.de('2026-11-10T16:45:00.000Z'),
    nivel: 'erro',
    onde: 'Backup',
    codigo,
    versaoApp: '0.0.1',
  });

export function contratoDoRegistroDeFalhas(nome: string, criar: () => RegistroDeFalhas) {
  describe(`contrato do RegistroDeFalhas: ${nome}`, () => {
    it('começa sem linhas', async () => {
      expect(await criar().lerLinhas()).toEqual([]);
    });

    it('devolve uma linha JSON por evento, na ordem de gravação', async () => {
      const registro = criar();
      await registro.registrar(evento('PRIMEIRA'));
      await registro.registrar(evento('SEGUNDA'));
      const linhas = await registro.lerLinhas();
      expect(linhas.map((l) => JSON.parse(l).codigo)).toEqual(['PRIMEIRA', 'SEGUNDA']);
    });
  });
}
