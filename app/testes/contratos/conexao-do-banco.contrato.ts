import type { ConexaoDoBanco } from '../../src/aplicacao/portas/conexao-do-banco';

export function contratoDaConexaoDoBanco(nome: string, criar: () => ConexaoDoBanco) {
  describe(`contrato da porta ConexaoDoBanco: ${nome}`, () => {
    it('um pragma definido é lido de volta com o mesmo valor', async () => {
      const conexao = criar();
      await conexao.abrir();
      await conexao.definirPragma('journal_mode', 'wal');
      await conexao.definirPragma('synchronous', 2);
      await conexao.definirPragma('foreign_keys', 1);
      expect(await conexao.lerPragma('journal_mode')).toBe('wal');
      expect(await conexao.lerPragma('synchronous')).toBe(2);
      expect(await conexao.lerPragma('foreign_keys')).toBe(1);
      await conexao.fechar();
    });

    it('o modo WAL continua valendo ao reabrir o banco', async () => {
      const conexao = criar();
      await conexao.abrir();
      await conexao.definirPragma('journal_mode', 'wal');
      await conexao.fechar();
      await conexao.abrir();
      expect(await conexao.lerPragma('journal_mode')).toBe('wal');
      await conexao.fechar();
    });
  });
}
