import Database from 'better-sqlite3';
import path from 'path';

import { MigrarBanco } from '../../../src/aplicacao/casos-de-uso/migrar-banco';
import { RegistrarFalha } from '../../../src/aplicacao/casos-de-uso/registrar-falha';
import {
  CopiaDoBancoEmDisco,
  criarPastaTemporaria,
  despejarTabelas,
  EsquemaDoBancoSqlite,
  pastaComMigracaoExtra,
} from '../../apoio/banco-sqlite-em-arquivo';
import {
  abrirBancoMigrado,
  criarFichaComSerie,
  criarSessaoComSerie,
  inserir,
} from '../../apoio/banco-sqlite';
import { RegistroDeFalhasEmMemoria } from '../../dubles/registro-de-falhas-em-memoria';
import { RelogioFixo } from '../../dubles/relogio-fixo';

// A "versão seguinte" do modelo é simulada com uma migração extra só no teste (US-001c).
const MIGRACAO_VALIDA = 'ALTER TABLE `ficha` ADD `coluna_so_de_teste` text;';
const MIGRACAO_QUE_FALHA =
  'ALTER TABLE `ficha` ADD `coluna_so_de_teste` text;\n--> statement-breakpoint\nUPDATE `ficha` SET `nome` = NULL;';

// Banco em arquivo na versão atual de produção, com dados de todas as áreas.
function criarBancoComDados(caminho: string) {
  const memoria = abrirBancoMigrado();
  const { exercicio } = criarFichaComSerie(memoria);
  criarSessaoComSerie(memoria, exercicio);
  criarSessaoComSerie(memoria, exercicio);
  inserir(memoria, 'medicao_corporal', { data: '2026-11-10', peso_gramas: 82300, cintura_mm: 850 });
  memoria.serialize();
  return memoria.backup(caminho);
}

async function montar(sqlDaVersaoSeguinte: string) {
  const pasta = criarPastaTemporaria();
  const caminho = path.join(pasta, 'nutrifit.db');
  await criarBancoComDados(caminho);
  const migracoes = pastaComMigracaoExtra(
    path.join(pasta, 'migracoes'),
    '0002_teste',
    sqlDaVersaoSeguinte,
  );
  const copia = new CopiaDoBancoEmDisco(caminho, path.join(pasta, 'copia.db'));
  const registro = new RegistroDeFalhasEmMemoria();
  const migrar = new MigrarBanco(
    copia,
    new EsquemaDoBancoSqlite(caminho, migracoes),
    new RegistrarFalha(registro, new RelogioFixo('2026-11-11T12:00:00.000Z'), '0.0.1'),
  );
  return { caminho, copia, migrar, registro };
}

describe('migração sem perda com SQLite real (CE63)', () => {
  it('banco da versão anterior com dados: depois de migrar, tudo continua igual', async () => {
    const { caminho, copia, migrar } = await montar(MIGRACAO_VALIDA);
    const antes = despejarTabelas(caminho, ['coluna_so_de_teste']);
    expect((await migrar.executar()).situacao).toBe('migrado');
    expect(despejarTabelas(caminho, ['coluna_so_de_teste'])).toEqual(antes);
    const banco = new Database(caminho, { readonly: true });
    expect(() => banco.prepare('SELECT coluna_so_de_teste FROM ficha').all()).not.toThrow();
    banco.close();
    expect(await copia.existe()).toBe(false);
  });

  it('migração que falha no meio: os dados anteriores ficam intactos e a falha é registrada', async () => {
    const { caminho, copia, migrar, registro } = await montar(MIGRACAO_QUE_FALHA);
    const antes = despejarTabelas(caminho, ['coluna_so_de_teste']);
    expect((await migrar.executar()).situacao).toBe('revertido');
    expect(despejarTabelas(caminho)).toEqual(antes);
    expect(await copia.existe()).toBe(true);
    expect(JSON.parse((await registro.lerLinhas())[0]!)).toMatchObject({
      codigo: 'MIGRACAO_FALHOU',
    });
  });

  it('as séries e sessões gravadas antes da migração continuam contadas depois', async () => {
    const { caminho, migrar } = await montar(MIGRACAO_VALIDA);
    await migrar.executar();
    const banco = new Database(caminho, { readonly: true });
    const total = (t: string) =>
      (banco.prepare(`SELECT COUNT(*) AS n FROM ${t}`).get() as { n: number }).n;
    expect([total('serie_executada'), total('sessao')]).toEqual([2, 2]);
    banco.close();
  });
});
