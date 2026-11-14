import { spawnSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';

import { transformSync } from '@babel/core';

const raizApp = path.resolve(__dirname, '../..');
const arquivoDasMigracoes = path.join(raizApp, 'drizzle/migrations.js');

// Só o APK de release empacota com o Metro; o Jest não, e por isso o `npm run ci` passou
// sem os arquivos de configuração (US-001f).
describe('o app empacota as migrações do Drizzle no APK', () => {
  it('o Metro do app resolve .sql como código-fonte', () => {
    const r = spawnSync(
      'node',
      [
        '-e',
        "require('metro-config').loadConfig({ cwd: process.cwd() }).then(c => console.log(JSON.stringify(c.resolver.sourceExts)))",
      ],
      { cwd: raizApp, encoding: 'utf8' },
    );
    expect(r.status).toBe(0);
    expect(JSON.parse(r.stdout.trim().split('\n').pop() ?? '[]')).toContain('sql');
  });

  it('o Babel do app transforma o import de um .sql em texto embutido no pacote', () => {
    const resultado = transformSync("import m0000 from './0000_esquema-inicial.sql';", {
      cwd: raizApp,
      root: raizApp,
      filename: arquivoDasMigracoes,
    });
    expect(resultado?.code).not.toContain('0000_esquema-inicial.sql');
    expect(resultado?.code).toContain('CREATE TABLE');
  });

  it('o Metro empacota drizzle/migrations.js para Android sem módulo não encontrado', () => {
    const pasta = fs.mkdtempSync(path.join(os.tmpdir(), 'nutrifit-apk-'));
    try {
      const r = spawnSync(
        'npx',
        [
          'expo',
          'export:embed',
          '--platform',
          'android',
          '--dev',
          'false',
          '--entry-file',
          'drizzle/migrations.js',
          '--bundle-output',
          path.join(pasta, 'index.android.bundle'),
          '--assets-dest',
          pasta,
        ],
        { cwd: raizApp, encoding: 'utf8', env: { ...process.env, CI: '1' } },
      );
      expect(r.stderr + r.stdout).not.toContain('Unable to resolve');
      expect(r.status).toBe(0);
      expect(fs.existsSync(path.join(pasta, 'index.android.bundle'))).toBe(true);
    } finally {
      fs.rmSync(pasta, { recursive: true, force: true });
    }
  }, 120_000);
});
