import { drizzle } from 'drizzle-orm/better-sqlite3';

import { RepositorioDoCatalogoSqlite } from '../../src/adaptadores/sqlite/repositorio-do-catalogo-sqlite';
import { GeradorDeIdentificadorSequencial } from '../dubles/gerador-de-identificador-sequencial';
import { Identificador } from '../../src/dominio/identificador';
import {
  abrirBancoMigrado,
  criarFichaComSerie,
  criarSessaoComSerie,
  inserir,
  AGORA,
} from '../apoio/banco-sqlite';
import { RepositorioDoCatalogoEmMemoria } from '../dubles/repositorio-do-catalogo-em-memoria';
import { contratoDoRepositorioDoCatalogo } from './repositorio-do-catalogo.contrato';

contratoDoRepositorioDoCatalogo('falso em memória', () => {
  const repositorio = new RepositorioDoCatalogoEmMemoria();
  const gerador = new GeradorDeIdentificadorSequencial();
  const exercicio = (emFicha: boolean, emSessao: boolean) => {
    const id = gerador.gerar();
    repositorio.semearExercicio(id, { emFicha, emSessao });
    return id;
  };
  const ficha = (comSessao: boolean) => {
    const id = gerador.gerar();
    repositorio.semearFicha(id, comSessao);
    return id;
  };
  return {
    repositorio,
    exercicioSemUso: () => exercicio(false, false),
    exercicioEmVersaoDeFicha: () => exercicio(true, false),
    exercicioEmSessao: () => exercicio(false, true),
    fichaSemSessao: () => ficha(false),
    fichaComSessao: () => ficha(true),
  };
});

contratoDoRepositorioDoCatalogo('adaptador SQLite', () => {
  const banco = abrirBancoMigrado();
  return {
    repositorio: new RepositorioDoCatalogoSqlite(drizzle(banco)),
    exercicioSemUso: () =>
      Identificador.de(
        inserir(banco, 'exercicio', { nome: 'Rosca', situacao: 'ativo', origem: 'inicial' }),
      ),
    exercicioEmVersaoDeFicha: () => Identificador.de(criarFichaComSerie(banco).exercicio),
    exercicioEmSessao: () => {
      const exercicio = inserir(banco, 'exercicio', {
        nome: 'Supino',
        situacao: 'ativo',
        origem: 'inicial',
      });
      criarSessaoComSerie(banco, exercicio);
      return Identificador.de(exercicio);
    },
    fichaSemSessao: () => Identificador.de(criarFichaComSerie(banco).ficha),
    fichaComSessao: () => {
      const { ficha, versao } = criarFichaComSerie(banco);
      inserir(banco, 'sessao', {
        ficha_id: ficha,
        versao_id: versao,
        inicio: AGORA,
        situacao: 'concluida',
      });
      return Identificador.de(ficha);
    },
  };
});
