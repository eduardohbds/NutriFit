import { drizzle } from 'drizzle-orm/better-sqlite3';

import { RepositorioDeAcoesDaIASqlite } from '../../src/adaptadores/sqlite/repositorio-de-acoes-da-ia-sqlite';
import { RepositorioDeFichasSqlite } from '../../src/adaptadores/sqlite/repositorio-de-fichas-sqlite';
import { Identificador } from '../../src/dominio/identificador';
import { abrirBancoMigrado, inserir } from '../apoio/banco-sqlite';
import { RepositorioDeAcoesDaIAEmMemoria } from '../dubles/repositorio-de-acoes-da-ia-em-memoria';
import { RepositorioDeFichasEmMemoria } from '../dubles/repositorio-de-fichas-em-memoria';
import { contratoDoRepositorioDeAcoesDaIA } from './repositorio-de-acoes-da-ia.contrato';

contratoDoRepositorioDeAcoesDaIA('falso em memória', () => ({
  acoes: new RepositorioDeAcoesDaIAEmMemoria(),
  fichas: new RepositorioDeFichasEmMemoria(),
  exercicioId: Identificador.de('00000000-0000-7000-8000-00000000e001'),
}));

contratoDoRepositorioDeAcoesDaIA('adaptador SQLite', () => {
  const banco = abrirBancoMigrado();
  const exercicio = inserir(banco, 'exercicio', {
    nome: 'Supino Reto',
    situacao: 'ativo',
    origem: 'inicial',
  });
  const bancoDrizzle = drizzle(banco);
  return {
    acoes: new RepositorioDeAcoesDaIASqlite(bancoDrizzle),
    fichas: new RepositorioDeFichasSqlite(bancoDrizzle),
    exercicioId: Identificador.de(exercicio),
  };
});
