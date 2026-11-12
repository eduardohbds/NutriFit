import { drizzle } from 'drizzle-orm/expo-sqlite';
import { migrate } from 'drizzle-orm/expo-sqlite/migrator';
import { openDatabaseAsync, type SQLiteDatabase } from 'expo-sqlite';

import type { EsquemaDoBanco, TotaisDoBanco } from '../../aplicacao/portas/esquema-do-banco';
import migracoes from '../../../drizzle/migrations';

// Abre e fecha o arquivo a cada chamada: a MigrarBanco precisa dele fechado para copiar.
export class EsquemaDoBancoExpo implements EsquemaDoBanco {
  constructor(private readonly nomeDoBanco: string) {}

  async migrar(): Promise<void> {
    await this.usar((banco) => migrate(drizzle(banco), migracoes));
  }

  async contarTotais(): Promise<TotaisDoBanco> {
    return this.usar(async (banco) => ({
      series: await contar(banco, 'serie_executada'),
      sessoes: await contar(banco, 'sessao'),
    }));
  }

  private async usar<T>(operacao: (banco: SQLiteDatabase) => Promise<T>): Promise<T> {
    const banco = await openDatabaseAsync(this.nomeDoBanco);
    try {
      return await operacao(banco);
    } finally {
      await banco.closeAsync();
    }
  }
}

async function contar(banco: SQLiteDatabase, tabela: string): Promise<number> {
  const existe = await banco.getFirstAsync('SELECT 1 FROM sqlite_master WHERE name = ?', tabela);
  if (!existe) return 0;
  const linha = await banco.getFirstAsync<{ n: number }>(`SELECT COUNT(*) AS n FROM ${tabela}`);
  return linha?.n ?? 0;
}
