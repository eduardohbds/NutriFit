import { transformSync } from '@babel/core';
import fs from 'fs';
import path from 'path';

const raiz = path.resolve(__dirname, '../..');
const arquivoDeMigracoes = path.join(raiz, 'drizzle/migrations.js');

// O Jest não passa pelo Metro; por isso o empacotamento dos .sql é checado aqui, com o mesmo
// Babel e a mesma configuração que o build de release usa (SP01, US-001d).
function transformar(codigo: string, arquivo: string): string {
  const resultado = transformSync(codigo, { cwd: raiz, root: raiz, filename: arquivo });
  return resultado?.code ?? '';
}

function carregarConfigDoMetro(): { resolver: { sourceExts: string[] } } | null {
  const caminho = path.join(raiz, 'metro.config.js');
  return fs.existsSync(caminho) ? require(caminho) : null;
}

describe('empacotamento das migrações .sql no app (US-001d)', () => {
  it('o Babel do app transforma o import de um .sql no texto do SQL', () => {
    const sql = path.join(raiz, 'drizzle/0000_esquema-inicial.sql');
    const saida = transformar("import m from './0000_esquema-inicial.sql';", sql);
    expect(saida).not.toMatch(/import\s/);
    expect(saida).toContain('CREATE TABLE');
  });

  it('o Metro do app inclui sql entre as extensões que resolve', () => {
    expect(carregarConfigDoMetro()?.resolver.sourceExts).toContain('sql');
  });

  it('drizzle/migrations.js, como o app o carrega, não deixa nenhum .sql como import', () => {
    const saida = transformar(fs.readFileSync(arquivoDeMigracoes, 'utf8'), arquivoDeMigracoes);
    expect(saida).not.toMatch(/\.sql['"]/);
    expect(saida).toContain('CREATE TABLE');
  });
});
