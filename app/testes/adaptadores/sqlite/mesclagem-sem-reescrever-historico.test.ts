import { drizzle } from 'drizzle-orm/better-sqlite3';

import { RepositorioDoCatalogoSqlite } from '../../../src/adaptadores/sqlite/repositorio-do-catalogo-sqlite';
import { Identificador } from '../../../src/dominio/identificador';
import {
  abrirBancoMigrado,
  criarFichaComSerie,
  criarSessaoComSerie,
  inserir,
} from '../../apoio/banco-sqlite';

type Banco = ReturnType<typeof abrirBancoMigrado>;

const TABELAS_DE_HISTORICO = [
  'ficha',
  'versao_ficha',
  'rotina',
  'item',
  'serie_planejada',
  'sessao',
  'exercicio_sessao',
  'serie_executada',
  'etapa_drop_set',
];

function fotografar(banco: Banco) {
  const fotos: Record<string, unknown[]> = {};
  for (const tabela of TABELAS_DE_HISTORICO)
    fotos[tabela] = banco.prepare(`SELECT * FROM ${tabela} ORDER BY id`).all();
  return fotos;
}

function vinculoDe(banco: Banco, id: string): string | null {
  const linha = banco.prepare('SELECT mesclado_em_id AS v FROM exercicio WHERE id = ?').get(id);
  return (linha as { v: string | null }).v;
}

function novoExercicio(banco: Banco, nome: string): string {
  return inserir(banco, 'exercicio', { nome, situacao: 'ativo', origem: 'usuario' });
}

describe('mesclagem no SQLite: o histórico não é reescrito (FI-4, RB02, RB03)', () => {
  it('guarda o vínculo em exercicio e deixa fichas, sessões e séries como estavam', async () => {
    const banco = abrirBancoMigrado();
    const { exercicio: mantido } = criarFichaComSerie(banco);
    criarSessaoComSerie(banco, mantido);
    const descartado = novoExercicio(banco, 'Supino Plano');
    criarSessaoComSerie(banco, descartado);
    const antes = fotografar(banco);
    const repositorio = new RepositorioDoCatalogoSqlite(drizzle(banco));

    await repositorio.mesclarExercicios(Identificador.de(mantido), Identificador.de(descartado));

    expect(vinculoDe(banco, descartado)).toBe(mantido);
    expect(vinculoDe(banco, mantido)).toBeNull();
    expect(fotografar(banco)).toEqual(antes);
  });

  it('liga ao novo mantido quem já apontava para o descartado, sem cadeia', async () => {
    const banco = abrirBancoMigrado();
    const mantido = novoExercicio(banco, 'Rosca Direta');
    const descartado = novoExercicio(banco, 'Rosca Bíceps');
    const absorvido = novoExercicio(banco, 'Rosca Barra');
    const repositorio = new RepositorioDoCatalogoSqlite(drizzle(banco));
    await repositorio.mesclarExercicios(Identificador.de(descartado), Identificador.de(absorvido));

    await repositorio.mesclarExercicios(Identificador.de(mantido), Identificador.de(descartado));

    expect(vinculoDe(banco, absorvido)).toBe(mantido);
    expect(vinculoDe(banco, descartado)).toBe(mantido);
    expect(vinculoDe(banco, mantido)).toBeNull();
  });
});
