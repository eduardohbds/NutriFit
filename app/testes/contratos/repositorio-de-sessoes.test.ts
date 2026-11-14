import { drizzle } from 'drizzle-orm/better-sqlite3';

import { RepositorioDeFichasSqlite } from '../../src/adaptadores/sqlite/repositorio-de-fichas-sqlite';
import { RepositorioDeSessoesSqlite } from '../../src/adaptadores/sqlite/repositorio-de-sessoes-sqlite';
import { Identificador } from '../../src/dominio/identificador';
import { abrirBancoMigrado, inserir } from '../apoio/banco-sqlite';
import { RepositorioDeFichasEmMemoria } from '../dubles/repositorio-de-fichas-em-memoria';
import { RepositorioDeSessoesEmMemoria } from '../dubles/repositorio-de-sessoes-em-memoria';
import { contratoDoRepositorioDeSessoes } from './repositorio-de-sessoes.contrato';

contratoDoRepositorioDeSessoes('falso em memória', () => ({
  fichas: new RepositorioDeFichasEmMemoria(),
  sessoes: new RepositorioDeSessoesEmMemoria(),
  exercicioId: Identificador.de('00000000-0000-7000-8000-00000000e001'),
}));

contratoDoRepositorioDeSessoes('adaptador SQLite', () => {
  const banco = abrirBancoMigrado();
  const exercicio = inserir(banco, 'exercicio', {
    nome: 'Supino Reto',
    situacao: 'ativo',
    origem: 'inicial',
  });
  const bancoDrizzle = drizzle(banco);
  return {
    fichas: new RepositorioDeFichasSqlite(bancoDrizzle),
    sessoes: new RepositorioDeSessoesSqlite(bancoDrizzle),
    exercicioId: Identificador.de(exercicio),
  };
});
