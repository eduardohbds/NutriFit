// Lint geral (typescript-eslint recomendado) mais a regra de camadas de eslint.camadas.js.
const tseslint = require('typescript-eslint');

const camadas = require('./eslint.camadas.js');

module.exports = [
  {
    ignores: ['node_modules/', 'android/', 'ios/', 'dist/', '.expo/', '.ferramentas/', 'coverage/'],
  },
  ...tseslint.configs.recommended,
  {
    // Scripts do Node (CommonJS) usam require.
    // Os testes usam require com jest.isolateModules para recarregar o módulo a cada caso.
    files: ['**/*.js', 'testes/**/*.ts'],
    rules: { '@typescript-eslint/no-require-imports': 'off' },
  },
  ...camadas,
];
