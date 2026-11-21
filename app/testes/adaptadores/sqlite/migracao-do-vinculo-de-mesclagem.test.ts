import Database from 'better-sqlite3';
import { readdirSync, readFileSync } from 'fs';
import path from 'path';

import { criarFichaComSerie, criarSessaoComSerie, inserir } from '../../apoio/banco-sqlite';

const PASTA = path.resolve(__dirname, '../../../drizzle');
const COLUNAS_ANTIGAS_DE_EXERCICIO = 'id, nome, situacao, origem, unilateral, equipamento';

function comandosDa(prefixo: string): string[] {
  const arquivo = readdirSync(PASTA).find((n) => n.startsWith(`${prefixo}_`) && n.endsWith('.sql'));
  expect(arquivo).toBeDefined();
  const sql = readFileSync(path.join(PASTA, arquivo as string), 'utf8');
  return sql.split('--> statement-breakpoint');
}

function aplicar(banco: Database.Database, prefixo: string) {
  for (const comando of comandosDa(prefixo)) banco.exec(comando);
}

// Banco como o do aparelho antes da US-006a: só as migrações 0000 a 0002.
function bancoAteA0002() {
  const banco = new Database(':memory:');
  banco.pragma('foreign_keys = ON');
  for (const prefixo of ['0000', '0001', '0002']) aplicar(banco, prefixo);
  return banco;
}

function fotografar(banco: Database.Database) {
  const consulta =
    "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'";
  const tabelas = banco.prepare(consulta).all() as { name: string }[];
  const fotos: Record<string, unknown[]> = {};
  for (const { name } of tabelas) {
    const colunas = name === 'exercicio' ? COLUNAS_ANTIGAS_DE_EXERCICIO : '*';
    fotos[name] = banco.prepare(`SELECT ${colunas} FROM ${name} ORDER BY id`).all();
  }
  return fotos;
}

describe('migração 0003: vínculo de mesclagem em exercicio (US-006a)', () => {
  it('em banco vazio, acrescenta mesclado_em_id anulável e nenhum exercício nasce mesclado', () => {
    const banco = bancoAteA0002();

    aplicar(banco, '0003');

    const colunas = banco.pragma('table_info(exercicio)') as { name: string; notnull: number }[];
    expect(colunas.find((c) => c.name === 'mesclado_em_id')?.notnull).toBe(0);
    const vinculados = banco.prepare('SELECT COUNT(mesclado_em_id) AS n FROM exercicio').get();
    expect(vinculados).toEqual({ n: 0 });
  });

  it('em banco com fichas e sessões, não muda nenhum dado existente', () => {
    const banco = bancoAteA0002();
    const { exercicio } = criarFichaComSerie(banco);
    criarSessaoComSerie(banco, exercicio);
    const antes = fotografar(banco);

    aplicar(banco, '0003');

    expect(fotografar(banco)).toEqual(antes);
  });

  it('só aceita apontar para um exercício que existe', () => {
    const banco = bancoAteA0002();
    aplicar(banco, '0003');
    const id = inserir(banco, 'exercicio', { nome: 'Rosca', situacao: 'ativo', origem: 'usuario' });

    const inexistente = '00000000-0000-7000-8000-000000000000';
    const atualizar = banco.prepare('UPDATE exercicio SET mesclado_em_id = ? WHERE id = ?');

    expect(() => atualizar.run(inexistente, id)).toThrow(/FOREIGN KEY/);
  });
});
