import fs from 'fs';
import path from 'path';

import { criarPastaTemporaria, raizApp, rodar } from './ajudas';

describe('npm run ci executa todas as etapas e falha se uma falhar', () => {
  it('o script ci do package.json chama o executor de etapas', () => {
    const pacote = JSON.parse(fs.readFileSync(path.join(raizApp, 'package.json'), 'utf8'));
    expect(pacote.scripts.ci).toBe('node scripts/ci.js');
  });

  it('lista as sete etapas na ordem: formatação, lint, tipos, camadas, testes, auditoria, segredos', () => {
    const r = rodar('node', ['scripts/ci.js', '--listar']);
    expect(r.status).toBe(0);
    expect(r.saida.trim().split('\n')).toEqual([
      'formatacao',
      'lint',
      'tipos',
      'camadas',
      'testes',
      'auditoria',
      'segredos',
    ]);
  });

  it('para na primeira etapa que falha, aponta qual foi e sai com código diferente de zero', () => {
    const pasta = criarPastaTemporaria({
      'etapas.json': JSON.stringify([
        { nome: 'passa', comando: 'node -e "process.exit(0)"' },
        { nome: 'quebra', comando: 'node -e "process.exit(1)"' },
        { nome: 'nao-roda', comando: "node -e \"require('fs').writeFileSync('marcador', 'x')\"" },
      ]),
    });
    const r = rodar('node', ['scripts/ci.js', '--etapas', path.join(pasta, 'etapas.json')], {
      env: { CI_PASTA_TRABALHO: pasta },
    });
    expect(r.status).not.toBe(0);
    expect(r.saida).toContain('quebra');
    expect(fs.existsSync(path.join(pasta, 'marcador'))).toBe(false);
  });

  it('sai com zero quando todas as etapas passam', () => {
    const pasta = criarPastaTemporaria({
      'etapas.json': JSON.stringify([
        { nome: 'a', comando: 'node -e "process.exit(0)"' },
        { nome: 'b', comando: 'node -e "process.exit(0)"' },
      ]),
    });
    const r = rodar('node', ['scripts/ci.js', '--etapas', path.join(pasta, 'etapas.json')]);
    expect(r.status).toBe(0);
  });
});
