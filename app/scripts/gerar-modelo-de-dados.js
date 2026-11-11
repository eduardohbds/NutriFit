// Gera o diagrama ER de docs/modelo-de-dados.md a partir do último snapshot do drizzle-kit,
// que é derivado do esquema; assim o diagrama nunca é desenhado à mão.
// Com --conferir, só verifica se o arquivo está em dia (usado pelos testes e pelo CI).
const fs = require('fs');
const path = require('path');

const raizApp = path.resolve(__dirname, '..');
const pastaDeMigracoes = path.join(raizApp, 'drizzle');
const documento = path.resolve(raizApp, '../docs/modelo-de-dados.md');

function lerUltimoSnapshot() {
  const journal = JSON.parse(fs.readFileSync(path.join(pastaDeMigracoes, 'meta/_journal.json')));
  const ultima = journal.entries[journal.entries.length - 1];
  const nome = `${String(ultima.idx).padStart(4, '0')}_snapshot.json`;
  return JSON.parse(fs.readFileSync(path.join(pastaDeMigracoes, 'meta', nome)));
}

function colunasUnicas(tabela) {
  return new Set(
    Object.values(tabela.uniqueConstraints ?? {})
      .filter((u) => u.columns.length === 1)
      .map((u) => u.columns[0]),
  );
}

function descreverColuna(coluna, chaves, unicas) {
  const marcas = [];
  if (coluna.primaryKey) marcas.push('PK');
  if (chaves.has(coluna.name)) marcas.push('FK');
  if (unicas.has(coluna.name)) marcas.push('UK');
  const marca = marcas.length ? ` ${marcas.join(', ')}` : '';
  const opcional = coluna.notNull || coluna.primaryKey ? '' : ' "opcional"';
  return `    ${coluna.type} ${coluna.name}${marca}${opcional}`;
}

function descreverTabela(tabela) {
  const chaves = new Set(Object.values(tabela.foreignKeys).flatMap((fk) => fk.columnsFrom));
  const unicas = colunasUnicas(tabela);
  const colunas = Object.values(tabela.columns).map((c) => descreverColuna(c, chaves, unicas));
  return [`  ${tabela.name} {`, ...colunas, '  }'];
}

// Vínculo obrigatório (coluna não nula) aparece como ||, opcional como |o.
function descreverVinculos(tabela) {
  return Object.values(tabela.foreignKeys).map((fk) => {
    const obrigatorio = fk.columnsFrom.every((c) => tabela.columns[c].notNull);
    const origem = obrigatorio ? '||' : '|o';
    return `  ${fk.tableTo} ${origem}--o{ ${tabela.name} : "${fk.columnsFrom.join(', ')}"`;
  });
}

function gerarDocumento(snapshot) {
  const tabelas = Object.values(snapshot.tables).sort((a, b) => a.name.localeCompare(b.name));
  const linhas = [
    '# Modelo de dados',
    '',
    '<!-- Gerado por app/scripts/gerar-modelo-de-dados.js a partir do esquema. Não edite à mão:',
    '     rode `npm run modelo-de-dados` em app/ depois de gerar uma migração. -->',
    '',
    'Vínculo `||` é obrigatório e `|o` é opcional. PK é a chave primária, FK aponta para outra',
    'tabela e UK é único. Valores calculados (seção 18.6 da especificação) não são guardados.',
    '',
    '```mermaid',
    'erDiagram',
    ...tabelas.flatMap(descreverTabela),
    ...tabelas.flatMap(descreverVinculos),
    '```',
    '',
  ];
  return linhas.join('\n');
}

function principal() {
  const esperado = gerarDocumento(lerUltimoSnapshot());
  if (!process.argv.includes('--conferir')) {
    fs.writeFileSync(documento, esperado);
    return;
  }
  const atual = fs.existsSync(documento) ? fs.readFileSync(documento, 'utf8') : '';
  if (atual !== esperado) {
    console.error('docs/modelo-de-dados.md desatualizado: rode `npm run modelo-de-dados` em app/.');
    process.exit(1);
  }
}

principal();
