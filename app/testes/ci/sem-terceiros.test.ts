import fs from 'fs';
import path from 'path';

import { raizApp } from './ajudas';

// RES12: nenhum registro de falha sai do aparelho e não há relatório de falhas de terceiros.
const ARQUIVOS_DO_REGISTRO = [
  'src/dominio/evento-de-falha.ts',
  'src/aplicacao/casos-de-uso/registrar-falha.ts',
  'src/aplicacao/portas/registro-de-falhas.ts',
  'src/adaptadores/sistema/registro-de-falhas-em-arquivo.ts',
  'src/interface/componentes/tela-de-erro.tsx',
];
const REDE = /\b(fetch|XMLHttpRequest|WebSocket|sendBeacon|axios)\b|https?:\/\//;
const RELATORIO_DE_TERCEIROS =
  /sentry|bugsnag|crashlytics|firebase|analytics|datadog|newrelic|appcenter|rollbar|logrocket/i;

describe('registro de falhas não vai para terceiros (RES12)', () => {
  it.each(ARQUIVOS_DO_REGISTRO)('%s não usa rede', (arquivo) => {
    const codigo = fs.readFileSync(path.join(raizApp, arquivo), 'utf8');
    expect(codigo).not.toMatch(REDE);
  });

  it('o adaptador do registro só importa o sistema de arquivos e o próprio projeto', () => {
    const codigo = fs.readFileSync(
      path.join(raizApp, 'src/adaptadores/sistema/registro-de-falhas-em-arquivo.ts'),
      'utf8',
    );
    const modulos = [...codigo.matchAll(/from '([^']+)'/g)].map((m) => m[1]);
    expect(modulos.filter((m) => !m.startsWith('.'))).toEqual(['expo-file-system']);
  });

  it('nenhuma dependência de relatório de falhas ou análise de uso', () => {
    const pacote = JSON.parse(fs.readFileSync(path.join(raizApp, 'package.json'), 'utf8'));
    const nomes = Object.keys({ ...pacote.dependencies, ...pacote.devDependencies });
    expect(nomes.filter((n) => RELATORIO_DE_TERCEIROS.test(n))).toEqual([]);
  });
});
