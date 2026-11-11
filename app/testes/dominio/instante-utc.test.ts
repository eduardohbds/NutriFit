import { ErroDeValidacao } from '../../src/dominio/erro-de-validacao';
import { InstanteUtc } from '../../src/dominio/instante-utc';

describe('InstanteUtc em ISO 8601', () => {
  it('aceita data e hora em UTC com milissegundos', () => {
    expect(InstanteUtc.de('2026-11-10T16:45:00.000Z').iso).toBe('2026-11-10T16:45:00.000Z');
  });

  it.each([
    ['fuso local', '2026-11-10T13:45:00.000-03:00'],
    ['só a data', '2026-11-10'],
    ['data inexistente', '2026-02-30T10:00:00.000Z'],
    ['texto qualquer', 'ontem'],
  ])('recusa %s', (_, iso) => {
    expect(() => InstanteUtc.de(iso)).toThrow(ErroDeValidacao);
  });
});
