import { limiteEfetivoDoTeste } from '../apoio/limite-efetivo-do-teste';

// O primeiro render de uma rota leva 8 s com o cache do Jest frio e a máquina ocupada (CI do
// GitHub), e o limite padrão é de 5 s. Só a pasta de interface precisa de mais tempo (US-043).
// Lê-se o limite efetivo, e não a configuração: o Jest ignora `testTimeout` dentro de `projects`.
describe('limite de tempo dos testes de interface (US-043)', () => {
  it('os testes de interface têm limite efetivo de 30 s, para o primeiro render sob carga', () => {
    expect(limiteEfetivoDoTeste()).toBeGreaterThanOrEqual(30_000);
  });
});
