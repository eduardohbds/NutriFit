import { drizzle } from 'drizzle-orm/better-sqlite3';

import { RepositorioDoCatalogoSqlite } from '../../src/adaptadores/sqlite/repositorio-do-catalogo-sqlite';
import { abrirBancoMigrado } from '../apoio/banco-sqlite';
import { RepositorioDoCatalogoEmMemoria } from '../dubles/repositorio-do-catalogo-em-memoria';
import { contratoDeCriacaoNoCatalogo } from './repositorio-do-catalogo-criacao.contrato';

contratoDeCriacaoNoCatalogo('falso em memória', () => {
  const repositorio = new RepositorioDoCatalogoEmMemoria();
  return { repositorio, semear: (exercicios) => repositorio.semearCatalogo(exercicios) };
});

contratoDeCriacaoNoCatalogo('adaptador SQLite', () => {
  const banco = abrirBancoMigrado();
  // Parte de um catálogo vazio: o banco migrado já traz o catálogo inicial (US-004a).
  banco.exec('DELETE FROM exercicio_grupo; DELETE FROM exercicio_sinonimo; DELETE FROM exercicio;');
  return { repositorio: new RepositorioDoCatalogoSqlite(drizzle(banco)), semear: () => undefined };
});
