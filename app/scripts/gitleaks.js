// Procura segredos na pasta indicada (padrão: o repositório inteiro) com o gitleaks.
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const raizApp = path.resolve(__dirname, '..');
const raizRepositorio = path.resolve(raizApp, '..');

function acharBinario() {
  const local = path.join(raizApp, '.ferramentas', 'gitleaks');
  if (fs.existsSync(local)) return local;
  const noPath = spawnSync('gitleaks', ['version'], { encoding: 'utf8' });
  return noPath.status === 0 ? 'gitleaks' : null;
}

function principal(pasta) {
  const binario = acharBinario();
  if (!binario) {
    console.error(
      'gitleaks não encontrado. Esperado em app/.ferramentas/gitleaks ou no PATH (versão 8.30.1).',
    );
    return 2;
  }
  // --redact: o segredo achado nunca vai para a saída do terminal (AGENTS.md seção 8).
  const args = ['detect', '--no-git', '--source', pasta, '--redact', '--no-banner', '-v'];
  args.push('--config', path.join(raizRepositorio, '.gitleaks.toml'));
  return spawnSync(binario, args, { stdio: 'inherit' }).status ?? 2;
}

process.exit(principal(path.resolve(process.argv[2] ?? raizRepositorio)));
