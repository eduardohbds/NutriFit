import { RelogioDoSistema } from '../../src/adaptadores/sistema/relogio-do-sistema';

describe('RelogioDoSistema', () => {
  afterEach(() => jest.useRealTimers());

  it('converte a hora local do aparelho para UTC', () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-11-10T13:45:00-03:00'));
    expect(new RelogioDoSistema().agora().iso).toBe('2026-11-10T16:45:00.000Z');
  });
});
