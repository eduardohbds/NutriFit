import {
  SalvarFicha,
  type ItemPedido,
  type PedidoDeFicha,
  type RotinaPedida,
  type SeriePedida,
} from '../../src/aplicacao/casos-de-uso/salvar-ficha';
import { Carga } from '../../src/dominio/carga';
import { ErroDeValidacao } from '../../src/dominio/erro-de-validacao';
import type { ExercicioDoCatalogo } from '../../src/dominio/exercicio';
import { Identificador } from '../../src/dominio/identificador';
import { GeradorDeIdentificadorSequencial } from '../dubles/gerador-de-identificador-sequencial';
import { RelogioFixo } from '../dubles/relogio-fixo';
import { RepositorioDeFichasEmMemoria } from '../dubles/repositorio-de-fichas-em-memoria';
import { RepositorioDoCatalogoEmMemoria } from '../dubles/repositorio-do-catalogo-em-memoria';

const SUPINO = Identificador.de('00000000-0000-7000-8000-0000000a1001');
const REMADA = Identificador.de('00000000-0000-7000-8000-0000000a1002');
const INEXISTENTE = Identificador.de('00000000-0000-7000-8000-0000000a1099');

function exercicio(id: Identificador, nome: string): ExercicioDoCatalogo {
  return {
    id,
    nome,
    situacao: 'ativo',
    origem: 'inicial',
    unilateral: false,
    equipamento: null,
    sinonimos: [],
    gruposDiretos: ['Peitoral'],
    gruposIndiretos: [],
  };
}

function iniciar() {
  const catalogo = new RepositorioDoCatalogoEmMemoria();
  catalogo.semearCatalogo([exercicio(SUPINO, 'Supino Reto'), exercicio(REMADA, 'Remada Curvada')]);
  const fichas = new RepositorioDeFichasEmMemoria();
  const gerador = new GeradorDeIdentificadorSequencial();
  return { fichas, caso: new SalvarFicha(fichas, catalogo, gerador, new RelogioFixo()) };
}

function serie(meta: string, resto: Partial<SeriePedida> = {}): SeriePedida {
  return { meta, cargaEmQuilos: null, tecnica: null, descansoSegundos: null, ...resto };
}

function item(
  ordem: number,
  exercicioId: Identificador,
  resto: Partial<ItemPedido> = {},
): ItemPedido {
  return {
    ordem,
    exercicioId,
    grupo: null,
    unilateral: false,
    observacoes: null,
    series: [serie('10'), serie('10')],
    ...resto,
  };
}

function rotina(nome: string, dia: number | null, itens: ItemPedido[]): RotinaPedida {
  return { nome, diaDaSemana: dia, itens };
}

function pedidoBase(): PedidoDeFicha {
  return {
    nome: 'Treino de Peito',
    rotinas: [rotina('Segunda', 1, [item(1, SUPINO), item(2, REMADA)])],
  };
}

async function recusa(promessa: Promise<unknown>): Promise<ErroDeValidacao> {
  const erro = await promessa.then(
    () => undefined,
    (e: unknown) => e,
  );
  expect(erro).toBeInstanceOf(ErroDeValidacao);
  return erro as ErroDeValidacao;
}

describe('SalvarFicha: tipo único de rotina (RB01)', () => {
  it('recusa rotinas que misturam dia da semana e rótulo de rotação, indicando a rotina', async () => {
    const { caso } = iniciar();
    const segunda = rotina('Segunda', 1, [item(1, SUPINO)]);
    const treinoB = rotina('Treino B', null, [item(1, REMADA)]);
    const pedido: PedidoDeFicha = { nome: 'Mista', rotinas: [segunda, treinoB] };

    const erro = await recusa(caso.executar(pedido));

    expect(erro.campo).toMatch(/Treino B/);
    expect(erro.esperado).toMatch(/mesmo tipo/);
  });

  it('aceita todas as rotinas por dia da semana', async () => {
    const { caso } = iniciar();
    const segunda = rotina('Segunda', 1, [item(1, SUPINO)]);
    const quarta = rotina('Quarta', 3, [item(1, REMADA)]);

    const { versao } = await caso.executar({ nome: 'Por dia', rotinas: [segunda, quarta] });

    expect(versao.rotinas.map((r) => r.diaDaSemana)).toEqual([1, 3]);
  });

  it('aceita todas as rotinas por rotação', async () => {
    const { caso } = iniciar();
    const treinoA = rotina('Treino A', null, [item(1, SUPINO)]);
    const treinoB = rotina('Treino B', null, [item(1, REMADA)]);

    const { versao } = await caso.executar({ nome: 'Rotação', rotinas: [treinoA, treinoB] });

    expect(versao.rotinas.map((r) => r.nome)).toEqual(['Treino A', 'Treino B']);
  });
});

describe('SalvarFicha: grava a versão (RB02)', () => {
  it('grava a ficha nova como versão 1 com autor usuário, data e o conteúdo informado', async () => {
    const { caso } = iniciar();
    const completo = item(1, SUPINO, {
      grupo: 'A',
      unilateral: true,
      observacoes: 'Pegada fechada',
      series: [
        serie('10', { cargaEmQuilos: 60, tecnica: 'Aquecimento', descansoSegundos: 90 }),
        serie('8-12', { cargaEmQuilos: 62.5 }),
        serie('falha'),
      ],
    });

    const { fichaId, versao } = await caso.executar({
      nome: 'Peito',
      rotinas: [rotina('Segunda', 1, [completo, item(2, REMADA)])],
    });

    expect(versao).toMatchObject({ fichaId, numero: 1, autor: 'usuario', motivo: null });
    expect(versao.criadaEm.iso).toBe('2026-11-10T13:45:00.000Z');
    const [primeiro, segundo] = versao.rotinas[0].itens;
    expect(primeiro).toMatchObject({
      exercicioId: SUPINO,
      grupoSequencia: 'A',
      unilateral: true,
      travado: false,
      observacoes: 'Pegada fechada',
    });
    expect(primeiro.series.map((s) => s.meta.tipo)).toEqual(['repeticoes', 'faixa', 'falha']);
    expect(primeiro.series[0]).toMatchObject({
      carga: Carga.deQuilos(60),
      tecnica: 'aquecimento',
      descansoSegundos: 90,
    });
    expect(segundo.exercicioId).toEqual(REMADA);
  });

  it('grava os exercícios na ordem informada, mesmo chegando fora de ordem', async () => {
    const { caso } = iniciar();
    const rotinas = [rotina('Segunda', 1, [item(2, SUPINO), item(1, REMADA)])];

    const { versao } = await caso.executar({ nome: 'Ordem', rotinas });

    expect(versao.rotinas[0].itens.map((i) => i.exercicioId)).toEqual([REMADA, SUPINO]);
  });

  it('numa ficha existente grava a versão seguinte, com o motivo, sem tocar na anterior', async () => {
    const { caso, fichas } = iniciar();
    const primeira = await caso.executar(pedidoBase());
    const [versao1Antes] = await fichas.listarVersoes(primeira.fichaId);

    const segunda = await caso.executar({
      ...pedidoBase(),
      fichaId: primeira.fichaId,
      motivo: '  Aumentei a carga ',
    });

    expect(segunda.versao.numero).toBe(2);
    expect(segunda.versao).toMatchObject({ autor: 'usuario', motivo: 'Aumentei a carga' });
    const versoes = await fichas.listarVersoes(primeira.fichaId);
    expect(versoes).toHaveLength(2);
    expect(versoes[0]).toEqual(versao1Antes);
  });
});

interface CasoDeRecusa {
  nome: string;
  itens: ItemPedido[];
  campo: RegExp;
  esperado: RegExp;
  recebido: unknown;
}

const RECUSAS: CasoDeRecusa[] = [
  {
    nome: 'exercício sem séries',
    itens: [item(1, SUPINO), item(2, REMADA, { series: [] })],
    campo: /Segunda, linha 2: séries/,
    esperado: /ao menos 1 série/,
    recebido: 0,
  },
  {
    nome: 'meta inválida',
    itens: [item(1, SUPINO), item(2, REMADA, { series: [serie('12-8')] })],
    campo: /Segunda, linha 2: meta/,
    esperado: /repetições \(10\)/,
    recebido: '12-8',
  },
  {
    nome: 'técnica fora da lista aceita',
    itens: [item(1, SUPINO), item(2, REMADA, { series: [serie('10', { tecnica: 'supersérie' })] })],
    campo: /Segunda, linha 2: técnica/,
    esperado: /aquecimento/,
    recebido: 'supersérie',
  },
  {
    nome: 'ordem repetida na rotina',
    itens: [item(1, SUPINO), item(1, REMADA)],
    campo: /Segunda, linha 1: ordem/,
    esperado: /ordem única/,
    recebido: 1,
  },
  {
    nome: 'exercício que não existe no catálogo',
    itens: [item(1, SUPINO), item(2, INEXISTENTE)],
    campo: /Segunda, linha 2: exercício/,
    esperado: /exercício do catálogo/,
    recebido: INEXISTENTE.valor,
  },
];

describe('SalvarFicha: bloqueia o salvamento com a linha indicada', () => {
  it.each(RECUSAS)('recusa $nome, sem gravar nada', async (caso) => {
    const { caso: salvar, fichas } = iniciar();
    const { fichaId } = await salvar.executar(pedidoBase());

    const erro = await recusa(
      salvar.executar({ nome: 'X', fichaId, rotinas: [rotina('Segunda', 1, caso.itens)] }),
    );

    expect(erro.campo).toMatch(caso.campo);
    expect(erro.esperado).toMatch(caso.esperado);
    expect(erro.recebido).toEqual(caso.recebido);
    expect(await fichas.listarVersoes(fichaId)).toHaveLength(1);
  });
});
