// O plugin inline-import deixa o Drizzle ler os arquivos .sql das migrações dentro do bundle.
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [['inline-import', { extensions: ['.sql'] }]],
  };
};
