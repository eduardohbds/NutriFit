const preset = require('jest-expo/jest-preset');

const base = {
  preset: 'jest-expo',
  // O uuid 14 só publica ESM; sem transformá-lo o Jest não consegue carregá-lo.
  transformIgnorePatterns: preset.transformIgnorePatterns.map((padrao) =>
    padrao.replace('|standard-navigation))', '|standard-navigation|uuid))'),
  ),
};

// Só a pasta de interface ganha mais tempo por teste: os demais continuam falhando rápido se
// travarem. O `testTimeout` dentro de `projects` é ignorado pelo Jest, e por isso o limite entra
// por `jest.setTimeout` num arquivo de preparação (US-043).
module.exports = {
  projects: [
    {
      ...base,
      displayName: 'interface',
      testMatch: ['<rootDir>/testes/interface/**/*.test.ts?(x)'],
      setupFilesAfterEnv: ['<rootDir>/testes/apoio/limite-de-tempo-de-interface.ts'],
    },
    {
      ...base,
      displayName: 'logica',
      testMatch: ['<rootDir>/testes/**/*.test.ts?(x)'],
      testPathIgnorePatterns: ['<rootDir>/testes/interface/'],
    },
  ],
};
