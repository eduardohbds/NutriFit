import fs from 'fs';
import path from 'path';

// Versões fixadas no SP01 (AGENTS.md seção 11). Mudar aqui exige o N6 completo (RT06).
const fixadas: Record<string, string> = {
  expo: '58.0.23',
  'react-native': '0.88.1',
  react: '19.3.0',
  typescript: '6.0.3',
  'expo-sqlite': '58.0.15',
  'expo-secure-store': '58.0.2',
  'expo-dev-client': '58.0.18',
  '@react-native-google-signin/google-signin': '17.0.0',
  'drizzle-orm': '0.45.4',
  'drizzle-kit': '0.31.11',
  'babel-plugin-inline-import': '3.0.0',
};

const lock = JSON.parse(
  fs.readFileSync(path.resolve(__dirname, '../../package-lock.json'), 'utf8'),
);

describe('versões fixadas no SP01', () => {
  it.each(Object.entries(fixadas))('%s está travado em %s no package-lock', (nome, versao) => {
    expect(lock.packages[`node_modules/${nome}`]?.version).toBe(versao);
  });
});
