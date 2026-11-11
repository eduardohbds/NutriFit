// Lint geral (typescript-eslint recomendado) mais a regra de camadas de eslint.camadas.js.
const tseslint = require('typescript-eslint');

const camadas = require('./eslint.camadas.js');

module.exports = [
  {
    // drizzle/ é gerado pelo drizzle-kit (SQL, snapshots e migrations.js).
    ignores: [
      'node_modules/',
      'android/',
      'ios/',
      'dist/',
      '.expo/',
      '.ferramentas/',
      'coverage/',
      'drizzle/',
    ],
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
