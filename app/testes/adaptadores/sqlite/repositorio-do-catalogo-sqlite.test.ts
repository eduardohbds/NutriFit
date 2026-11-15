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

function contar(banco: Banco, tabela: string): number {
  return (banco.prepare(`SELECT COUNT(*) AS n FROM ${tabela}`).get() as { n: number }).n;
}

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

describe('RepositorioDoCatalogoSqlite: arquivar não apaga histórico (RB02, RB03, RB04)', () => {
  it('arquivar o exercício e a ficha deixa todas as linhas do histórico no lugar', async () => {
    const banco = abrirBancoMigrado();
    const { ficha, exercicio } = criarFichaComSerie(banco);
    criarSessaoComSerie(banco, exercicio);
    const antes = TABELAS_DO_HISTORICO.map((t) => contar(banco, t));
    const repositorio = new RepositorioDoCatalogoSqlite(drizzle(banco));

    await repositorio.arquivarExercicio(Identificador.de(exercicio));
    await repositorio.arquivarFicha(Identificador.de(ficha));

    expect(TABELAS_DO_HISTORICO.map((t) => contar(banco, t))).toEqual(antes);
  });

  it('excluir um exercício sem uso leva junto só os grupos e sinônimos dele', async () => {
    const banco = abrirBancoMigrado();
    const exercicio = inserir(banco, 'exercicio', {
      nome: 'Rosca de Punho Inversa',
      situacao: 'ativo',
      origem: 'usuario',
    });
    const grupo = (banco.prepare('SELECT id FROM grupo_muscular LIMIT 1').get() as { id: string })
      .id;
    inserir(banco, 'exercicio_grupo', {
      exercicio_id: exercicio,
      grupo_id: grupo,
      papel: 'direto',
    });
    inserir(banco, 'exercicio_sinonimo', { exercicio_id: exercicio, texto: 'Reverse Wrist Curl' });
    const repositorio = new RepositorioDoCatalogoSqlite(drizzle(banco));

    await repositorio.excluirExercicio(Identificador.de(exercicio));

    expect(contar(banco, 'exercicio')).toBe(0);
    expect(contar(banco, 'exercicio_grupo')).toBe(0);
    expect(contar(banco, 'exercicio_sinonimo')).toBe(0);
    expect(contar(banco, 'grupo_muscular')).toBeGreaterThan(0);
  });
});
