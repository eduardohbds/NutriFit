const path = require('path');

// O preset do Expo vem como dependência do próprio `expo` e pode ficar aninhado em
// node_modules/expo/; resolver a partir dele funciona nos dois casos.
const presetDoExpo = require.resolve('babel-preset-expo', {
  paths: [path.dirname(require.resolve('expo/package.json'))],
});

// O plugin inline-import deixa o Drizzle ler os arquivos .sql das migrações dentro do bundle.
module.exports = function (api) {
  api.cache(true);
  return {
    presets: [presetDoExpo],
    plugins: [['inline-import', { extensions: ['.sql'] }]],
  };
};
