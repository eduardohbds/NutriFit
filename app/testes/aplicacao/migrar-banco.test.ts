import { MigrarBanco } from '../../src/aplicacao/casos-de-uso/migrar-banco';
import { RegistrarFalha } from '../../src/aplicacao/casos-de-uso/registrar-falha';
import { BancoEmMemoria } from '../dubles/banco-em-memoria';
import { RegistroDeFalhasEmMemoria } from '../dubles/registro-de-falhas-em-memoria';
import { RelogioFixo } from '../dubles/relogio-fixo';

function montar() {
  const banco = new BancoEmMemoria();
  banco.totais = { series: 12, sessoes: 3 };
  const registro = new RegistroDeFalhasEmMemoria();
  const registrarFalha = new RegistrarFalha(
    registro,
    new RelogioFixo('2026-11-11T12:00:00.000Z'),
    '0.0.1',
  );
  const migrar = new MigrarBanco(banco.copia, banco.esquema, registrarFalha);
  const falhas = async () => (await registro.lerLinhas()).map((linha) => JSON.parse(linha));
  return { banco, migrar, falhas };
}

describe('MigrarBanco: cópia, migração e volta (arquitetura 7.3, CE63)', () => {
  it('copia o banco antes de migrar e só apaga a cópia depois que os totais batem', async () => {
    const { banco, migrar, falhas } = montar();
    const resultado = await migrar.executar();
    expect(resultado.situacao).toBe('migrado');
    expect(banco.chamadas).toEqual(['copiar', 'migrar', 'descartar']);
    expect(banco.conteudo).toBe('versao-seguinte');
    expect(await falhas()).toEqual([]);
  });

  it('se a migração falha no meio, volta à cópia, mantém os dados e registra a falha', async () => {
    const { banco, migrar, falhas } = montar();
    banco.aoMigrar = () => {
      banco.conteudo = 'pela-metade';
      throw new Error('coluna cintura 85 inválida');
    };
    const resultado = await migrar.executar();
    expect(resultado.situacao).toBe('revertido');
    expect(banco.chamadas).toEqual(['copiar', 'migrar', 'restaurar']);
    expect(banco.conteudo).toBe('versao-anterior');
    expect(banco.totais).toEqual({ series: 12, sessoes: 3 });
    expect(await banco.copia.existe()).toBe(true);
    expect(await falhas()).toMatchObject([
      { nivel: 'erro', onde: 'MigrarBanco', codigo: 'MIGRACAO_FALHOU' },
    ]);
  });

  it('se os totais de séries ou sessões não batem depois de migrar, volta à cópia', async () => {
    const { banco, migrar, falhas } = montar();
    banco.aoMigrar = () => {
      banco.conteudo = 'versao-seguinte';
      banco.totais = { series: 11, sessoes: 3 };
    };
    const resultado = await migrar.executar();
    expect(resultado.situacao).toBe('revertido');
    expect(banco.conteudo).toBe('versao-anterior');
    expect(banco.totais).toEqual({ series: 12, sessoes: 3 });
    expect(banco.chamadas).not.toContain('descartar');
    expect(await falhas()).toMatchObject([{ onde: 'MigrarBanco', codigo: 'TOTAIS_DIVERGENTES' }]);
  });

  it('o registro da falha não guarda a mensagem do erro nem valores do banco', async () => {
    const { banco, migrar, falhas } = montar();
    banco.aoMigrar = () => {
      throw new Error('coluna cintura 85 inválida');
    };
    await migrar.executar();
    expect(JSON.stringify(await falhas())).not.toContain('85');
  });

  it('sem conseguir copiar o banco, não migra nada e avisa', async () => {
    const { banco, migrar, falhas } = montar();
    banco.falharAoCopiar = true;
    const resultado = await migrar.executar();
    expect(resultado.situacao).toBe('nao_migrado');
    expect(banco.chamadas).toEqual(['copiar']);
    expect(banco.conteudo).toBe('versao-anterior');
    expect(await falhas()).toMatchObject([{ onde: 'MigrarBanco', codigo: 'COPIA_FALHOU' }]);
  });

  it('se nem a volta à cópia funciona, registra, mantém a cópia e deixa o erro subir', async () => {
    const { banco, migrar, falhas } = montar();
    banco.aoMigrar = () => {
      throw new Error('falha');
    };
    banco.falharAoRestaurar = true;
    await expect(migrar.executar()).rejects.toThrow();
    expect(await banco.copia.existe()).toBe(true);
    expect((await falhas()).map((f) => f.codigo)).toContain('RESTAURACAO_FALHOU');
  });
});
