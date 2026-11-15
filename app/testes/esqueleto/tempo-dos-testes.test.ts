import { spawnSync } from 'child_process';
import fs from 'fs';
import path from 'path';

import { limiteEfetivoDoTeste } from '../apoio/limite-efetivo-do-teste';

const raizApp = path.resolve(__dirname, '../..');
const pastaDeInterface = path.join(raizApp, 'testes/interface');

function testesEm(pasta: string): string[] {
  return fs.readdirSync(pasta, { withFileTypes: true }).flatMap((e) => {
    const caminho = path.join(pasta, e.name);
    if (e.isDirectory()) return testesEm(caminho);
    return /\.test\.tsx?$/.test(e.name) ? [caminho] : [];
  });
}

// O limite maior vale só para a pasta de interface (US-043, testado em testes/interface).
describe('limite de tempo dos demais testes (US-043)', () => {
  it('fora da pasta de interface o limite continua de 5 s: teste travado falha rápido', () => {
    expect(limiteEfetivoDoTeste()).toBeLessThanOrEqual(5_000);
  });

  it('todo arquivo de teste de testes/ roda uma vez só, em exatamente um projeto', () => {
    const r = spawnSync('npx', ['jest', '--listTests'], { cwd: raizApp, encoding: 'utf8' });
    const listados = r.stdout
      .split('\n')
      .map((linha) => linha.trim())
      .filter((linha) => linha.endsWith('.test.ts') || linha.endsWith('.test.tsx'))
      .sort();

    expect(r.status).toBe(0);
    expect(listados).toEqual(testesEm(path.join(raizApp, 'testes')).sort());
    expect(listados.some((arquivo) => arquivo.startsWith(pastaDeInterface))).toBe(true);
  }, 60_000);
});
