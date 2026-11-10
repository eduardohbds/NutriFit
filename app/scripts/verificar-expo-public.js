// Variáveis EXPO_PUBLIC_ vão embutidas no APK e qualquer um pode lê-las: só valores públicos (AGENTS.md seções 8 e 12).
const fs = require('fs');
const path = require('path');

const raizApp = path.resolve(__dirname, '..');
const PERMITIDAS = new Set(['EXPO_PUBLIC_WORKER_URL', 'EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID']);
const IGNORADAS = new Set([
  'node_modules',
  '.git',
  '.ferramentas',
  'android',
  'ios',
  'testes',
  'dist',
]);
const PADRAO = /EXPO_PUBLIC_[A-Z0-9_]+/g;

function listarArquivos(caminho) {
  if (!fs.existsSync(caminho)) return [];
  if (!fs.statSync(caminho).isDirectory()) return [caminho];
  return fs
    .readdirSync(caminho)
    .filter((nome) => !IGNORADAS.has(nome))
    .flatMap((nome) => listarArquivos(path.join(caminho, nome)));
}

function variaveisProibidas(arquivo) {
  const texto = fs.readFileSync(arquivo, 'utf8');
  return [...texto.matchAll(PADRAO)].map((m) => m[0]).filter((nome) => !PERMITIDAS.has(nome));
}

function origensPadrao() {
  const raiz = path.resolve(raizApp, '..');
  return [
    path.join(raizApp, 'src'),
    path.join(raizApp, 'app'),
    path.join(raizApp, 'app.config.ts'),
    path.join(raizApp, '.env.example'),
    path.join(raiz, '.github'),
    path.join(raiz, '.env.example'),
  ];
}

function principal(origens) {
  const achados = origens
    .flatMap(listarArquivos)
    .flatMap((arquivo) => variaveisProibidas(arquivo).map((nome) => `${arquivo}: ${nome}`));
  if (achados.length === 0) return 0;
  console.error('Variável EXPO_PUBLIC_ não permitida (vai embutida no APK):');
  achados.forEach((a) => console.error(`  ${a}`));
  console.error(`Permitidas: ${[...PERMITIDAS].join(', ')}`);
  return 1;
}

const argumento = process.argv[2];
process.exit(principal(argumento ? [path.resolve(argumento)] : origensPadrao()));
