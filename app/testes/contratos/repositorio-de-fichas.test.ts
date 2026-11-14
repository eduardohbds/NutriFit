import { drizzle } from 'drizzle-orm/better-sqlite3';

import { RepositorioDeFichasSqlite } from '../../src/adaptadores/sqlite/repositorio-de-fichas-sqlite';
import { Identificador } from '../../src/dominio/identificador';
import { abrirBancoMigrado, inserir } from '../apoio/banco-sqlite';
import { RepositorioDeFichasEmMemoria } from '../dubles/repositorio-de-fichas-em-memoria';
import { contratoDoRepositorioDeFichas } from './repositorio-de-fichas.contrato';

const EXERCICIO_QUALQUER = Identificador.de('00000000-0000-7000-8000-00000000e001');

contratoDoRepositorioDeFichas('falso em memória', () => ({
  repositorio: new RepositorioDeFichasEmMemoria(),
  exercicioId: EXERCICIO_QUALQUER,
}));

contratoDoRepositorioDeFichas('adaptador SQLite', () => {
  const banco = abrirBancoMigrado();
  const exercicio = inserir(banco, 'exercicio', {
    nome: 'Supino Reto',
    situacao: 'ativo',
    origem: 'inicial',
  });
  return {
    repositorio: new RepositorioDeFichasSqlite(drizzle(banco)),
    exercicioId: Identificador.de(exercicio),
  };
});
