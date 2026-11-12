import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import fs from 'fs';
import os from 'os';
import path from 'path';

import type { CopiaDoBanco } from '../../src/aplicacao/portas/copia-do-banco';
import type { EsquemaDoBanco, TotaisDoBanco } from '../../src/aplicacao/portas/esquema-do-banco';

export const pastaDeMigracoesDeProducao = path.resolve(__dirname, '../../drizzle');

// SQLite real em arquivo, com as migrações de uma pasta. Abre e fecha o arquivo a cada chamada,
// como o app faz antes de migrar, para a cópia do arquivo ser consistente.
export class EsquemaDoBancoSqlite implements EsquemaDoBanco {
  constructor(
    private readonly caminho: string,
    private readonly pastaDeMigracoes: string,
  ) {}

  async migrar(): Promise<void> {
    const banco = this.abrir();
    try {
      migrate(drizzle(banco), { migrationsFolder: this.pastaDeMigracoes });
    } finally {
      banco.close();
    }
  }

  async contarTotais(): Promise<TotaisDoBanco> {
    const banco = this.abrir();
    try {
      return { series: contar(banco, 'serie_executada'), sessoes: contar(banco, 'sessao') };
    } finally {
      banco.close();
    }
  }

  private abrir() {
    const banco = new Database(this.caminho);
    banco.pragma('foreign_keys = ON');
    return banco;
  }
}

function contar(banco: Database.Database, tabela: string): number {
  const existe = banco.prepare('SELECT 1 FROM sqlite_master WHERE name = ?').get(tabela);
  if (!existe) return 0;
  return (banco.prepare(`SELECT COUNT(*) AS n FROM ${tabela}`).get() as { n: number }).n;
}

export class CopiaDoBancoEmDisco implements CopiaDoBanco {
  constructor(
    private readonly caminho: string,
    readonly caminhoDaCopia: string,
  ) {}
  async existe() {
    return fs.existsSync(this.caminhoDaCopia);
  }
  async criar() {
    fs.copyFileSync(this.caminho, this.caminhoDaCopia);
  }
  async restaurar() {
    fs.copyFileSync(this.caminhoDaCopia, this.caminho);
  }
  async descartar() {
    fs.rmSync(this.caminhoDaCopia, { force: true });
  }
}

export function criarPastaTemporaria(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'nutrifit-migracao-'));
}

// "Versão seguinte" só para teste: a pasta de produção mais uma migração extra, sem tocar em drizzle/.
export function pastaComMigracaoExtra(destino: string, tag: string, sql: string): string {
  fs.cpSync(pastaDeMigracoesDeProducao, destino, { recursive: true });
  const jornalCaminho = path.join(destino, 'meta/_journal.json');
  const jornal = JSON.parse(fs.readFileSync(jornalCaminho, 'utf8'));
  jornal.entries.push({
    idx: jornal.entries.length,
    version: '6',
    when: jornal.entries[jornal.entries.length - 1].when + 1000,
    tag,
    breakpoints: true,
  });
  fs.writeFileSync(jornalCaminho, JSON.stringify(jornal, null, 2));
  fs.writeFileSync(path.join(destino, `${tag}.sql`), sql);
  return destino;
}

// Todas as linhas de todas as tabelas de dados, para comparar antes e depois.
export function despejarTabelas(caminho: string, colunasIgnoradas: string[] = []) {
  const banco = new Database(caminho, { readonly: true });
  try {
    const tabelas = banco
      .prepare(
        "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE '\\_\\_%' ESCAPE '\\' AND name NOT LIKE 'sqlite_%' ORDER BY name",
      )
      .all() as { name: string }[];
    return Object.fromEntries(
      tabelas.map(({ name }) => [
        name,
        (banco.prepare(`SELECT * FROM ${name} ORDER BY id`).all() as Record<string, unknown>[]).map(
          (linha) =>
            Object.fromEntries(
              Object.entries(linha).filter(([c]) => !colunasIgnoradas.includes(c)),
            ),
        ),
      ]),
    );
  } finally {
    banco.close();
  }
}
