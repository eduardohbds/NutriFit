import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import fs from 'fs';
import path from 'path';

import { RepositorioDeFichasSqlite } from '../../src/adaptadores/sqlite/repositorio-de-fichas-sqlite';
import { RepositorioDoCatalogoSqlite } from '../../src/adaptadores/sqlite/repositorio-do-catalogo-sqlite';
import {
  SalvarFicha,
  type PedidoDeFicha,
  type RotinaPedida,
} from '../../src/aplicacao/casos-de-uso/salvar-ficha';
import { abrirBancoMigrado } from '../apoio/banco-sqlite';
import { GeradorDeIdentificadorSequencial } from '../dubles/gerador-de-identificador-sequencial';
import { RelogioFixo } from '../dubles/relogio-fixo';
import { LINHAS_DA_FICHA_DT01, type LinhaDaFichaDT01 } from './ficha-de-referencia';

const csvDaDt01 = path.resolve(__dirname, '../../../docs/DT01_ficha_v1.csv');
const DIAS = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta'];

function lerCsvDaDt01(): string[][] {
  const texto = fs.readFileSync(csvDaDt01, 'utf8').replace(/^﻿/, '');
  return texto
    .split(/\r?\n/)
    .filter((linha) => linha.trim() !== '')
    .slice(1)
    .map((linha) => linha.split(';'));
}

async function salvarDt01() {
  const banco: Database.Database = abrirBancoMigrado();
  const bancoDrizzle = drizzle(banco);
  const catalogo = new RepositorioDoCatalogoSqlite(bancoDrizzle);
  const fichas = new RepositorioDeFichasSqlite(bancoDrizzle);
  const exercicios = await catalogo.listarExercicios();
  // A ficha pode trazer um sinônimo (Reverse Wrist Curl), que o catálogo reconhece sem pergunta.
  const porNome = new Map(
    exercicios.flatMap((e) => [e.nome, ...e.sinonimos].map((nome) => [nome, e.id] as const)),
  );
  const rotinas: RotinaPedida[] = DIAS.map((dia, indice) => ({
    nome: dia,
    diaDaSemana: indice + 1,
    itens: LINHAS_DA_FICHA_DT01.filter((l) => l.rotina === dia).map((l) => ({
      ordem: l.ordem,
      exercicioId: porNome.get(l.exercicio)!,
      grupo: null,
      unilateral: l.unilateral,
      observacoes: l.observacoes,
      series: Array.from({ length: l.series }, () => ({
        meta: l.meta,
        cargaEmQuilos: null,
        tecnica: null,
        descansoSegundos: null,
      })),
    })),
  }));
  const pedido: PedidoDeFicha = { nome: 'Ficha de referência (DT01)', rotinas };
  const caso = new SalvarFicha(
    fichas,
    catalogo,
    new GeradorDeIdentificadorSequencial(),
    new RelogioFixo(),
  );
  const nomes = new Map(exercicios.map((e) => [e.id.valor, e.nome]));
  return { resultado: await caso.executar(pedido), fichas, nomes };
}

describe('ficha de referência DT01 recriada pelo SalvarFicha (US-007b)', () => {
  it('grava as 30 linhas na versão 1, em 5 rotinas por dia da semana com 6 itens cada', async () => {
    const { resultado, fichas } = await salvarDt01();

    const versao = await fichas.buscarVersaoAtual(resultado.fichaId);

    expect(versao?.numero).toBe(1);
    expect(versao?.rotinas.map((r) => [r.nome, r.diaDaSemana])).toEqual([
      ['Segunda', 1],
      ['Terça', 2],
      ['Quarta', 3],
      ['Quinta', 4],
      ['Sexta', 5],
    ]);
    expect(versao?.rotinas.map((r) => r.itens.length)).toEqual([6, 6, 6, 6, 6]);
  });

  it('cada item aponta para o exercício do catálogo inicial, com séries e meta da ficha', async () => {
    const { resultado, fichas, nomes } = await salvarDt01();

    const versao = await fichas.buscarVersaoAtual(resultado.fichaId);

    const gravadas = versao?.rotinas.flatMap((r) =>
      r.itens.map((i) => [r.nome, nomes.get(i.exercicioId.valor), i.series.length]),
    );
    const esperadas = LINHAS_DA_FICHA_DT01.map((l) => [
      l.rotina,
      l.exercicio === 'Reverse Wrist Curl' ? 'Rosca de Punho Inversa' : l.exercicio,
      l.series,
    ]);
    expect(gravadas).toEqual(esperadas);
    expect(gravadas).toHaveLength(30);
  });

  it('as linhas da fixture são as do CSV da DT01, exceto a ambígua, que segue a decisão do usuário', () => {
    const doCsv = lerCsvDaDt01().map(
      ([rotina, , ordem, , exercicio, series, meta, , , , unilateral]): LinhaDaFichaDT01 => ({
        rotina,
        diaDaSemana: DIAS.indexOf(rotina) + 1,
        ordem: Number(ordem),
        exercicio: exercicio === 'Corrida ou Esteira' ? 'Esteira' : exercicio,
        series: Number(series),
        meta,
        unilateral: unilateral === 'Sim',
        observacoes: exercicio === 'Corrida ou Esteira' ? 'ou Corrida' : null,
      }),
    );

    expect(LINHAS_DA_FICHA_DT01).toEqual(doCsv);
    expect(doCsv).toHaveLength(30);
  });

  it('Corrida ou Esteira vira Esteira com "ou Corrida" nas observações, sem escolha inventada', () => {
    const cardio = LINHAS_DA_FICHA_DT01.find((l) => l.rotina === 'Sexta' && l.ordem === 1);

    expect(cardio).toMatchObject({
      exercicio: 'Esteira',
      series: 1,
      meta: '30min',
      observacoes: 'ou Corrida',
    });
  });

  it('as duas Elevações Frontais ficam em exercícios diferentes, sem mesclar', async () => {
    const { resultado, fichas, nomes } = await salvarDt01();

    const versao = await fichas.buscarVersaoAtual(resultado.fichaId);

    const quarta = versao?.rotinas[2].itens[2].exercicioId.valor;
    const sexta = versao?.rotinas[4].itens[5].exercicioId.valor;
    expect([nomes.get(quarta!), nomes.get(sexta!)]).toEqual([
      'Elevação Frontal',
      'Elevação Frontal com Halteres',
    ]);
  });
});
