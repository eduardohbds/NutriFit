import { AbrirBanco } from '../../src/aplicacao/casos-de-uso/abrir-banco';
import { ConfigurarConexao } from '../../src/aplicacao/casos-de-uso/configurar-conexao';
import { MigrarBanco } from '../../src/aplicacao/casos-de-uso/migrar-banco';
import { RegistrarFalha } from '../../src/aplicacao/casos-de-uso/registrar-falha';
import { BancoEmMemoria } from '../dubles/banco-em-memoria';
import { ConexaoEmMemoria } from '../dubles/conexao-em-memoria';
import { RegistroDeFalhasEmMemoria } from '../dubles/registro-de-falhas-em-memoria';
import { RelogioFixo } from '../dubles/relogio-fixo';

function montar() {
  const banco = new BancoEmMemoria();
  banco.totais = { series: 12, sessoes: 3 };
  const conexao = new ConexaoEmMemoria();
  const registrarFalha = new RegistrarFalha(
    new RegistroDeFalhasEmMemoria(),
    new RelogioFixo('2026-11-12T12:00:00.000Z'),
    '0.0.1',
  );
  const migrar = new MigrarBanco(banco.copia, banco.esquema, registrarFalha);
  const abrirBanco = new AbrirBanco(conexao, migrar, new ConfigurarConexao(conexao));
  return { banco, conexao, abrirBanco };
}

describe('AbrirBanco: migrar antes de usar (CE63, RNF08)', () => {
  it('migra pela MigrarBanco antes de a conexão ficar disponível para uso', async () => {
    const { banco, conexao, abrirBanco } = montar();
    let abertaDuranteAMigracao: boolean | null = null;
    banco.aoMigrar = () => {
      abertaDuranteAMigracao = conexao.aberta;
    };
    const resultado = await abrirBanco.executar();
    expect(resultado.situacao).toBe('migrado');
    expect(banco.chamadas).toEqual(['copiar', 'migrar', 'descartar']);
    expect(abertaDuranteAMigracao).toBe(false);
    expect(conexao.aberta).toBe(true);
  });

  it('devolve a conexão já configurada com WAL, sincronização completa e chaves estrangeiras', async () => {
    const { conexao, abrirBanco } = montar();
    await abrirBanco.executar();
    expect(await conexao.lerPragma('journal_mode')).toBe('wal');
    expect(await conexao.lerPragma('synchronous')).toBe(2);
    expect(await conexao.lerPragma('foreign_keys')).toBe(1);
  });

  it.each([
    [
      'revertido',
      () => {
        throw new Error('coluna inválida');
      },
    ],
  ] as const)(
    'migração %s é devolvida para virar aviso e a conexão abre no banco anterior',
    async (situacao, falha) => {
      const { banco, conexao, abrirBanco } = montar();
      banco.aoMigrar = falha;
      const resultado = await abrirBanco.executar();
      expect(resultado.situacao).toBe(situacao);
      expect(conexao.aberta).toBe(true);
    },
  );

  it('migração que nem começou (sem cópia) também é devolvida para virar aviso', async () => {
    const { banco, abrirBanco } = montar();
    banco.falharAoCopiar = true;
    const resultado = await abrirBanco.executar();
    expect(resultado.situacao).toBe('nao_migrado');
  });

  it('a cópia só é feita com a conexão fechada e sem escrita pendente no -wal', async () => {
    const { banco, conexao, abrirBanco } = montar();
    conexao.walPendente = true; // o app anterior foi encerrado à força
    let aoCopiar: { aberta: boolean; walPendente: boolean } | null = null;
    const criar = banco.copia.criar;
    banco.copia.criar = async () => {
      aoCopiar = { aberta: conexao.aberta, walPendente: conexao.walPendente };
      await criar();
    };
    await abrirBanco.executar();
    expect(aoCopiar).toEqual({ aberta: false, walPendente: false });
  });
});
