import fs from 'fs';
import path from 'path';

import { raizApp, rodar } from './ajudas';

// Roda o ESLint só com a regra de camadas, lendo o código pela entrada padrão (RT03).
function checarImportacao(arquivo: string, codigo: string) {
  const r = rodar(
    'npx',
    ['eslint', '--stdin', '--stdin-filename', arquivo, '-c', 'eslint.camadas.js', '-f', 'json'],
    { entrada: codigo },
  );
  const resultado = r.saida.trim().startsWith('[') ? JSON.parse(r.saida)[0] : { messages: [] };
  const violacoes = (resultado.messages as { ruleId: string | null }[]).filter((m) =>
    m.ruleId?.startsWith('boundaries/'),
  );
  return { status: r.status, violacoes };
}

const adaptadorFalso = path.join(raizApp, 'src/adaptadores/adaptador-falso.ts');

describe('regra de camadas barra importações proibidas no domínio (RT03)', () => {
  beforeAll(() => fs.writeFileSync(adaptadorFalso, 'export const x = 1;\n'));
  afterAll(() => fs.rmSync(adaptadorFalso, { force: true }));

  it.each([
    ['React', "import { useState } from 'react';"],
    ['Expo', "import * as SQLite from 'expo-sqlite';"],
    ['Drizzle', "import { drizzle } from 'drizzle-orm/expo-sqlite';"],
    ['um adaptador', "import { x } from '../adaptadores/adaptador-falso';"],
  ])('reprova arquivo em src/dominio que importa %s', (_nome, codigo) => {
    const r = checarImportacao('src/dominio/violacao.ts', codigo + '\nexport const y = x;\n');
    expect(r.status).toBe(1);
    expect(r.violacoes.length).toBeGreaterThan(0);
  });

  it('aceita arquivo em src/dominio que importa só outro arquivo do domínio', () => {
    const r = checarImportacao(
      'src/dominio/valido.ts',
      "import { a } from './outro';\nexport const b = a;\n",
    );
    expect(r.violacoes).toEqual([]);
  });
});
