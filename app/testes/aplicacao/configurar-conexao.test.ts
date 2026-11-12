import { ConfigurarConexao } from '../../src/aplicacao/casos-de-uso/configurar-conexao';
import { ConexaoEmMemoria } from '../dubles/conexao-em-memoria';

describe('ConfigurarConexao (RNF08)', () => {
  it('liga o modo WAL, a sincronização completa e as chaves estrangeiras', async () => {
    const conexao = new ConexaoEmMemoria();
    await conexao.abrir();
    await new ConfigurarConexao(conexao).executar();
    expect(await conexao.lerPragma('journal_mode')).toBe('wal');
    expect(await conexao.lerPragma('synchronous')).toBe(2);
    expect(await conexao.lerPragma('foreign_keys')).toBe(1);
  });
});
