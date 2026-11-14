// babel-plugin-inline-import embute os .sql das migrações do Drizzle no pacote do app (SP01, US-001f).
module.exports = function configurarBabel(api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [['inline-import', { extensions: ['.sql'] }]],
  };
};
