const preset = require('jest-expo/jest-preset');

module.exports = {
  preset: 'jest-expo',
  testMatch: ['<rootDir>/testes/**/*.test.ts?(x)'],
  // O uuid 14 só publica ESM; sem transformá-lo o Jest não consegue carregá-lo.
  transformIgnorePatterns: preset.transformIgnorePatterns.map((padrao) =>
    padrao.replace('|standard-navigation))', '|standard-navigation|uuid))'),
  ),
};
