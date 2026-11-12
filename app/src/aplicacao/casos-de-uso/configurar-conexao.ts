import type { ConexaoDoBanco } from '../portas/conexao-do-banco';

// WAL com sincronização completa: a série concluída está no disco quando a gravação confirma
// (RNF08). Chaves estrangeiras ficam desligadas por padrão no SQLite, então são ligadas aqui.
export class ConfigurarConexao {
  constructor(private readonly conexao: ConexaoDoBanco) {}

  async executar(): Promise<void> {
    await this.conexao.definirPragma('journal_mode', 'wal');
    await this.conexao.definirPragma('synchronous', 2);
    await this.conexao.definirPragma('foreign_keys', 1);
  }
}
