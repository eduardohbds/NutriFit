import { drizzle } from 'drizzle-orm/better-sqlite3';

import { RepositorioDeSessoesSqlite } from '../../src/adaptadores/sqlite/repositorio-de-sessoes-sqlite';
import { Identificador } from '../../src/dominio/identificador';
import { abrirBancoMigrado, inserir } from '../apoio/banco-sqlite';
import { RepositorioDeSessoesEmMemoria } from '../dubles/repositorio-de-sessoes-em-memoria';
import { contratoDoEncerramentoDeSessao } from './repositorio-de-sessoes-encerramento.contrato';

contratoDoEncerramentoDeSessao('falso em memória', () => ({
  sessoes: new RepositorioDeSessoesEmMemoria(),
  exercicioId: Identificador.de('00000000-0000-7000-8000-00000000e004'),
}));

contratoDoEncerramentoDeSessao('adaptador SQLite', () => {
  const banco = abrirBancoMigrado();
  const exercicio = inserir(banco, 'exercicio', {
    nome: 'Supino Reto',
    situacao: 'ativo',
    origem: 'inicial',
  });
  return {
    sessoes: new RepositorioDeSessoesSqlite(drizzle(banco)),
    exercicioId: Identificador.de(exercicio),
  };
});
