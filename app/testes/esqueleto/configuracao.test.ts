import path from 'path';

const caminho = path.resolve(__dirname, '../../app.config.ts');

function carregarConfig(variante?: string) {
  const anterior = process.env.APP_VARIANT;
  if (variante) process.env.APP_VARIANT = variante;
  else delete process.env.APP_VARIANT;
  try {
    let config: { name: string; android: { package: string } } | undefined;
    jest.isolateModules(() => {
      config = require(caminho).default;
    });
    return config!;
  } finally {
    if (anterior === undefined) delete process.env.APP_VARIANT;
    else process.env.APP_VARIANT = anterior;
  }
}

describe('app.config.ts (AGENTS.md seção 1 e arquitetura 13.3)', () => {
  it('release usa o pacote com.ehbds.nutrifit e o nome NutriFit', () => {
    const config = carregarConfig();
    expect(config.android.package).toBe('com.ehbds.nutrifit');
    expect(config.name).toBe('NutriFit');
  });

  it('APP_VARIANT=dev usa o pacote .dev e o nome NutriFit (dev)', () => {
    const config = carregarConfig('dev');
    expect(config.android.package).toBe('com.ehbds.nutrifit.dev');
    expect(config.name).toBe('NutriFit (dev)');
  });
});
