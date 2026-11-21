import { drizzle } from 'drizzle-orm/better-sqlite3';

import { RepositorioDeSessoesSqlite } from '../../src/adaptadores/sqlite/repositorio-de-sessoes-sqlite';
import { Identificador } from '../../src/dominio/identificador';
import { abrirBancoMigrado, inserir } from '../apoio/banco-sqlite';
import { RepositorioDeSessoesEmMemoria } from '../dubles/repositorio-de-sessoes-em-memoria';
import { contratoDeHistoricoDeSessoes } from './repositorio-de-sessoes-historico.contrato';

contratoDeHistoricoDeSessoes('falso em memória', () => ({
  sessoes: new RepositorioDeSessoesEmMemoria(),
  exercicios: [
    Identificador.de('00000000-0000-7000-8000-00000000f001'),
    Identificador.de('00000000-0000-7000-8000-00000000f002'),
  ],
}));

contratoDeHistoricoDeSessoes('adaptador SQLite', () => {
  const banco = abrirBancoMigrado();
  const novo = (nome: string) =>
    Identificador.de(inserir(banco, 'exercicio', { nome, situacao: 'ativo', origem: 'inicial' }));
  const sessoes = new RepositorioDeSessoesSqlite(drizzle(banco));
  return { sessoes, exercicios: [novo('Supino Reto'), novo('Supino Plano')] };
});
