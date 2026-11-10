import fs from 'fs';
import path from 'path';

const raiz = path.resolve(__dirname, '../..');

describe('estrutura de pastas (AGENTS.md seção 3)', () => {
  it.each(['dominio', 'aplicacao', 'adaptadores', 'interface', 'composicao'])(
    'existe app/src/%s',
    (camada) => {
      expect(fs.statSync(path.join(raiz, 'src', camada)).isDirectory()).toBe(true);
    },
  );

  it('as rotas do Expo Router ficam em app/app/', () => {
    expect(fs.statSync(path.join(raiz, 'app')).isDirectory()).toBe(true);
  });
});
