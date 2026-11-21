import { drizzle } from 'drizzle-orm/better-sqlite3';

import { RepositorioDoCatalogoSqlite } from '../../src/adaptadores/sqlite/repositorio-do-catalogo-sqlite';
import { abrirBancoMigrado, inserir } from '../apoio/banco-sqlite';
import { RepositorioDoCatalogoEmMemoria } from '../dubles/repositorio-do-catalogo-em-memoria';
import { contratoDeSinonimosNoCatalogo } from './repositorio-do-catalogo-sinonimos.contrato';

contratoDeSinonimosNoCatalogo('falso em memória', () => {
  const repositorio = new RepositorioDoCatalogoEmMemoria();
  return { repositorio, semear: (exercicios) => repositorio.semearCatalogo(exercicios) };
});

contratoDeSinonimosNoCatalogo('adaptador SQLite', () => {
  const banco = abrirBancoMigrado();
  // Parte de um catálogo vazio: o banco migrado já traz o catálogo inicial (US-004a).
  banco.exec('DELETE FROM exercicio_grupo; DELETE FROM exercicio_sinonimo; DELETE FROM exercicio;');
  const idDoGrupo = (nome: string) =>
    (banco.prepare('SELECT id FROM grupo_muscular WHERE nome = ?').get(nome) as { id: string }).id;
  return {
    repositorio: new RepositorioDoCatalogoSqlite(drizzle(banco)),
    semear: (exercicios) => {
      for (const e of exercicios) {
        banco
          .prepare(
            'INSERT INTO exercicio (id, nome, situacao, origem, unilateral, equipamento) VALUES (?, ?, ?, ?, ?, ?)',
          )
          .run(e.id.valor, e.nome, e.situacao, e.origem, e.unilateral ? 1 : 0, e.equipamento);
        for (const texto of e.sinonimos)
          inserir(banco, 'exercicio_sinonimo', { exercicio_id: e.id.valor, texto });
        for (const [papel, grupos] of [
          ['direto', e.gruposDiretos],
          ['indireto', e.gruposIndiretos],
        ] as const)
          for (const grupo of grupos)
            inserir(banco, 'exercicio_grupo', {
              exercicio_id: e.id.valor,
              grupo_id: idDoGrupo(grupo),
              papel,
            });
      }
    },
  };
});
