import type { ConexaoDoBanco } from '../portas/conexao-do-banco';
import type { ConfigurarConexao } from './configurar-conexao';
import type { MigrarBanco, SituacaoDaMigracao } from './migrar-banco';

// Prepara o banco para as telas: a migração só roda com o arquivo fechado e completo, porque a
// cópia de segurança é do arquivo e um -wal pendente ficaria de fora dela (US-001c).
export class AbrirBanco {
  constructor(
    private readonly conexao: ConexaoDoBanco,
    private readonly migrarBanco: MigrarBanco,
    private readonly configurarConexao: ConfigurarConexao,
  ) {}

  async executar(): Promise<{ situacao: SituacaoDaMigracao }> {
    // Abrir e fechar de novo faz o SQLite recuperar o -wal deixado por um encerramento forçado.
    await this.conexao.abrir();
    await this.conexao.fechar();
    const { situacao } = await this.migrarBanco.executar();
    await this.conexao.abrir();
    await this.configurarConexao.executar();
    return { situacao };
  }
}
