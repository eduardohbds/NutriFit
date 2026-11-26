import { RelogioFixo } from './relogio-fixo';

describe('RelogioFixo: dia da semana (US-012a)', () => {
  it.each([
    ['segunda', '2026-11-09T12:00:00.000Z', 1],
    ['terça', '2026-11-10T12:00:00.000Z', 2],
    ['quarta', '2026-11-11T12:00:00.000Z', 3],
    ['quinta', '2026-11-12T12:00:00.000Z', 4],
    ['sexta', '2026-11-13T12:00:00.000Z', 5],
    ['sábado', '2026-11-14T12:00:00.000Z', 6],
    ['domingo', '2026-11-15T12:00:00.000Z', 7],
  ])(
    'uma %s fixa tem o dia da semana certo, sempre, sem depender do relógio do sistema',
    (_nome, iso, dia) => {
      const relogio = new RelogioFixo(iso);

      expect(relogio.diaDaSemana()).toBe(dia);
      expect(relogio.diaDaSemana()).toBe(dia);
    },
  );

  it('o instante padrão do dublê cai numa terça-feira', () => {
    expect(new RelogioFixo().diaDaSemana()).toBe(2);
  });
});
