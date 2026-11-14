// O Metro precisa reconhecer .sql para empacotar as migrações do Drizzle (SP01, US-001f).
const { getDefaultConfig } = require('expo/metro-config');

const configuracao = getDefaultConfig(__dirname);
configuracao.resolver.sourceExts.push('sql');

module.exports = configuracao;
