import { drizzle } from 'drizzle-orm/better-sqlite3';

import { RepositorioDoCatalogoSqlite } from '../../../src/adaptadores/sqlite/repositorio-do-catalogo-sqlite';
import { EditarGruposDoExercicio } from '../../../src/aplicacao/casos-de-uso/editar-grupos-do-exercicio';
import { ErroDeValidacao } from '../../../src/dominio/erro-de-validacao';
import { Identificador } from '../../../src/dominio/identificador';
import {
  abrirBancoMigrado,
  criarFichaComSerie,
  criarSessaoComSerie,
} from '../../apoio/banco-sqlite';

type Banco = ReturnType<typeof abrirBancoMigrado>;

const TABELAS_DO_HISTORICO = [
  'ficha',
  'versao_ficha',
  'rotina',
  'item',
  'serie_planejada',
  'sessao',
  'exercicio_sessao',
  'serie_executada',
];

function despejar(banco: Banco, tabela: string) {
  return banco.prepare(`SELECT * FROM ${tabela} ORDER BY id`).all();
}

describe('edição de grupos com SQLite real', () => {
  it('editar os grupos de um exercício com histórico não toca em ficha, sessão nem série (FI-4)', async () => {
    const banco = abrirBancoMigrado();
    const { exercicio } = criarFichaComSerie(banco);
    criarSessaoComSerie(banco, exercicio);
    const antes = TABELAS_DO_HISTORICO.map((t) => despejar(banco, t));
    const caso = new EditarGruposDoExercicio(new RepositorioDoCatalogoSqlite(drizzle(banco)));

    await caso.executar({
      exercicioId: Identificador.de(exercicio),
      gruposDiretos: ['Peitoral'],
      gruposIndiretos: ['Tríceps'],
    });

    expect(TABELAS_DO_HISTORICO.map((t) => despejar(banco, t))).toEqual(antes);
  });

  it('todo grupo da tabela grupo_muscular é aceito pelo caso de uso, e são 16', async () => {
    const banco = abrirBancoMigrado();
    const nomes = (
      banco.prepare('SELECT nome FROM grupo_muscular').all() as { nome: string }[]
    ).map((g) => g.nome);
    const [supino] = await new RepositorioDoCatalogoSqlite(drizzle(banco)).listarExercicios();
    const caso = new EditarGruposDoExercicio(new RepositorioDoCatalogoSqlite(drizzle(banco)));

    await caso.executar({ exercicioId: supino.id, gruposDiretos: nomes, gruposIndiretos: [] });

    expect(nomes).toHaveLength(16);
    const [lido] = (
      await new RepositorioDoCatalogoSqlite(drizzle(banco)).listarExercicios()
    ).filter((e) => e.id.valor === supino.id.valor);
    expect([...lido.gruposDiretos].sort()).toEqual([...nomes].sort());
  });

  it('a gravação é atômica: um grupo inválido no meio não deixa o exercício sem os grupos antigos', async () => {
    const banco = abrirBancoMigrado();
    const repositorio = new RepositorioDoCatalogoSqlite(drizzle(banco));
    const supino = (await repositorio.listarExercicios()).find((e) => e.nome === 'Supino Reto')!;

    await expect(
      repositorio.gravarGrupos(supino.id, { diretos: ['Costas'], indiretos: ['Inexistente'] }),
    ).rejects.toBeInstanceOf(ErroDeValidacao);

    const depois = (await repositorio.listarExercicios()).find((e) => e.nome === 'Supino Reto')!;
    expect(depois.gruposDiretos).toEqual(['Peitoral']);
    expect([...depois.gruposIndiretos].sort()).toEqual(['Ombro anterior', 'Tríceps']);
  });
});
