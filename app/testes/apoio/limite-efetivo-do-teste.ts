// Limite de tempo que o jest-circus aplica a cada teste do arquivo em execução. Sem
// `jest.setTimeout`, o valor não existe e vale o padrão do Jest, de 5 s.
const LIMITE_PADRAO_DO_JEST = 5_000;

export function limiteEfetivoDoTeste(): number {
  const valor = (globalThis as unknown as Record<symbol, unknown>)[
    Symbol.for('TEST_TIMEOUT_SYMBOL')
  ];
  return typeof valor === 'number' ? valor : LIMITE_PADRAO_DO_JEST;
}
