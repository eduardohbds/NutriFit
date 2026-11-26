import { RelogioDoSistema } from '../../src/adaptadores/sistema/relogio-do-sistema';

describe('RelogioDoSistema', () => {
  afterEach(() => jest.useRealTimers());

  it('converte a hora local do aparelho para UTC', () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-11-10T13:45:00-03:00'));
    expect(new RelogioDoSistema().agora().iso).toBe('2026-11-10T16:45:00.000Z');
  });

  // O dia vem do fuso do aparelho (RB16): a data é montada na hora local, então o resultado não
  // depende do fuso em que o teste roda.
  it.each([
    ['segunda', new Date(2026, 10, 9, 12, 0), 1],
    ['quarta', new Date(2026, 10, 11, 12, 0), 3],
    ['sábado', new Date(2026, 10, 14, 12, 0), 6],
    ['domingo', new Date(2026, 10, 15, 12, 0), 7],
  ])('informa %s como o dia da semana certo, de 1 a 7', (_nome, agora, esperado) => {
    jest.useFakeTimers().setSystemTime(agora);

    expect(new RelogioDoSistema().diaDaSemana()).toBe(esperado);
  });

  it('usa o dia local, e não o dia em UTC, perto da meia-noite', () => {
    jest.useFakeTimers().setSystemTime(new Date(2026, 10, 11, 23, 30));

    expect(new RelogioDoSistema().diaDaSemana()).toBe(3);
  });
});
