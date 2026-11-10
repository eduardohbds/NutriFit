// Executor do CI local e do GitHub Actions: as mesmas etapas nos dois (AGENTS.md seção 4).
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const raiz = path.resolve(__dirname, '..');

const ETAPAS_PADRAO = [
  { nome: 'formatacao', comando: 'npx prettier --check .' },
  { nome: 'lint', comando: 'npx eslint . --config eslint.config.js' },
  { nome: 'tipos', comando: 'npx tsc --noEmit' },
  {
    nome: 'camadas',
    comando: 'npx eslint src app --config eslint.camadas.js --no-error-on-unmatched-pattern',
  },
  { nome: 'testes', comando: 'npx jest --ci' },
  { nome: 'auditoria', comando: 'npm audit --audit-level=high' },
  { nome: 'segredos', comando: 'node scripts/gitleaks.js' },
];

function lerEtapas(argumentos) {
  const posicao = argumentos.indexOf('--etapas');
  if (posicao === -1) return ETAPAS_PADRAO;
  return JSON.parse(fs.readFileSync(argumentos[posicao + 1], 'utf8'));
}

function executarEtapa(etapa, pasta) {
  console.log(`\n== ci: ${etapa.nome} ==`);
  const resultado = spawnSync(etapa.comando, { cwd: pasta, shell: true, stdio: 'inherit' });
  return resultado.status === 0;
}

function principal(argumentos) {
  const etapas = lerEtapas(argumentos);
  if (argumentos.includes('--listar')) {
    console.log(etapas.map((e) => e.nome).join('\n'));
    return 0;
  }
  const pasta = process.env.CI_PASTA_TRABALHO ?? raiz;
  for (const etapa of etapas) {
    if (executarEtapa(etapa, pasta)) continue;
    console.error(`\nci: a etapa "${etapa.nome}" falhou; as seguintes não foram executadas.`);
    return 1;
  }
  console.log('\nci: todas as etapas passaram.');
  return 0;
}

process.exit(principal(process.argv.slice(2)));
