// Regra de camadas do AGENTS.md seção 3: o núcleo (domínio e aplicação) não importa nada de fora (RT03).
const boundaries = require('eslint-plugin-boundaries');
const tseslint = require('typescript-eslint');

const camadas = ['dominio', 'aplicacao', 'adaptadores', 'interface', 'composicao'];

module.exports = [
  {
    files: ['src/**/*.{ts,tsx}', 'app/**/*.{ts,tsx}'],
    languageOptions: { parser: tseslint.parser },
    plugins: { boundaries },
    settings: {
      // Sem isto o plugin só resolve .js e trata imports de .ts como desconhecidos.
      'import/resolver': { node: { extensions: ['.ts', '.tsx', '.js', '.jsx'] } },
      'boundaries/elements': [
        ...camadas.map((tipo) => ({ type: tipo, pattern: `src/${tipo}`, partialMatch: false })),
        { type: 'rotas', pattern: 'app', partialMatch: false },
      ],
    },
    rules: {
      'boundaries/dependencies': [
        2,
        {
          default: 'disallow',
          checkAllOrigins: true,
          policies: [
            {
              from: { element: { type: 'dominio' } },
              allow: { to: { element: { type: 'dominio' } } },
            },
            {
              from: { element: { type: 'aplicacao' } },
              allow: { to: { element: { types: ['dominio', 'aplicacao'] } } },
            },
            {
              from: { element: { type: 'adaptadores' } },
              allow: { to: { element: { types: ['dominio', 'aplicacao', 'adaptadores'] } } },
            },
            {
              from: { element: { type: 'interface' } },
              allow: { to: { element: { types: ['dominio', 'aplicacao', 'interface'] } } },
            },
            {
              from: { element: { type: 'composicao' } },
              allow: { to: { element: { types: camadas } } },
            },
            {
              from: { element: { type: 'rotas' } },
              allow: { to: { element: { types: ['interface', 'composicao'] } } },
            },
            // Só adaptadores, interface, composição e rotas conhecem bibliotecas externas (React, Expo, Drizzle).
            {
              from: { element: { types: ['dominio', 'aplicacao'] } },
              disallow: { to: { origin: ['external', 'core'] } },
              message:
                'O núcleo não importa biblioteca externa: use uma porta em aplicacao/portas.',
            },
            {
              from: { element: { types: ['adaptadores', 'interface', 'composicao', 'rotas'] } },
              allow: { to: { origin: ['external', 'core'] } },
            },
          ],
        },
      ],
    },
  },
];
