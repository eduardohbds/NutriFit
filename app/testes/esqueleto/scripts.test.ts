import fs from 'fs';
import path from 'path';

const raiz = path.resolve(__dirname, '../..');
const pacote = JSON.parse(fs.readFileSync(path.join(raiz, 'package.json'), 'utf8'));

describe('scripts do projeto (AGENTS.md seção 4)', () => {
  it('npm test roda o Jest sem interação', () => {
    expect(pacote.scripts.test).toBe('jest --ci');
  });

  it('npm run android faz o build de depuração no celular, sem Expo Go', () => {
    expect(pacote.scripts.android).toBe('expo run:android');
  });

  it('o package-lock.json existe para o npm ci instalar versões travadas', () => {
    expect(fs.existsSync(path.join(raiz, 'package-lock.json'))).toBe(true);
  });
});
