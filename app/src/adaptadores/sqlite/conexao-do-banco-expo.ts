import { openDatabaseAsync, type SQLiteDatabase } from 'expo-sqlite';

import type { ConexaoDoBanco } from '../../aplicacao/portas/conexao-do-banco';

// Só roda no aparelho (expo-sqlite); a ordem abrir, configurar e fechar é coberta no Jest
// pelo falso, e o arquivo de verdade é verificado no Poco M5s (N6).
export class ConexaoDoBancoExpo implements ConexaoDoBanco {
  private banco: SQLiteDatabase | null = null;

  constructor(private readonly nomeDoBanco: string) {}

  async abrir(): Promise<void> {
    this.banco = await openDatabaseAsync(this.nomeDoBanco);
  }

  // O checkpoint com TRUNCATE leva o -wal para o arquivo principal e o zera antes da cópia.
  async fechar(): Promise<void> {
    if (!this.banco) return;
    await this.banco.execAsync('PRAGMA wal_checkpoint(TRUNCATE)');
    await this.banco.closeAsync();
    this.banco = null;
  }

  async definirPragma(nome: string, valor: string | number): Promise<void> {
    await this.aberto().execAsync(`PRAGMA ${nome} = ${valor}`);
  }

  async lerPragma(nome: string): Promise<string | number> {
    const linha = await this.aberto().getFirstAsync<Record<string, string | number>>(
      `PRAGMA ${nome}`,
    );
    if (!linha) throw new Error(`pragma ${nome} sem resposta`);
    return Object.values(linha)[0];
  }

  private aberto(): SQLiteDatabase {
    if (!this.banco) throw new Error('conexão com o banco fechada');
    return this.banco;
  }
}
