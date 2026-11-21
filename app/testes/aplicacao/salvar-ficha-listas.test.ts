import {
  SalvarFicha,
  type ItemPedido,
  type ListasDoItem,
  type PedidoDeFicha,
} from '../../src/aplicacao/casos-de-uso/salvar-ficha';
import { ErroDeValidacao } from '../../src/dominio/erro-de-validacao';
import type { ExercicioDoCatalogo } from '../../src/dominio/exercicio';
import { Identificador } from '../../src/dominio/identificador';
import { GeradorDeIdentificadorSequencial } from '../dubles/gerador-de-identificador-sequencial';
import { RelogioFixo } from '../dubles/relogio-fixo';
import { RepositorioDeFichasEmMemoria } from '../dubles/repositorio-de-fichas-em-memoria';
import { RepositorioDoCatalogoEmMemoria } from '../dubles/repositorio-do-catalogo-em-memoria';

const SUPINO = Identificador.de('00000000-0000-7000-8000-0000000c1001');
const LATERAL = Identificador.de('00000000-0000-7000-8000-0000000c1002');
const FRONTAL = Identificador.de('00000000-0000-7000-8000-0000000c1003');

function exercicio(id: Identificador, nome: string): ExercicioDoCatalogo {
  return {
    id,
    nome,
    situacao: 'ativo',
    origem: 'inicial',
    unilateral: false,
    equipamento: null,
    sinonimos: [],
    gruposDiretos: ['Ombro lateral'],
    gruposIndiretos: [],
  };
}

function iniciar() {
  const catalogo = new RepositorioDoCatalogoEmMemoria();
  catalogo.semearCatalogo([
    exercicio(SUPINO, 'Supino Reto'),
    exercicio(LATERAL, 'Elevação Lateral'),
    exercicio(FRONTAL, 'Elevação Frontal'),
  ]);
  const fichas = new RepositorioDeFichasEmMemoria();
  const gerador = new GeradorDeIdentificadorSequencial();
  return { fichas, caso: new SalvarFicha(fichas, catalogo, gerador, new RelogioFixo()) };
}

function listas(quantidade: number, resto: Partial<ListasDoItem> = {}): ListasDoItem {
  return { quantidade, meta: '10', carga: null, tecnica: null, descanso: null, ...resto };
}

function itemComListas(ordem: number, texto: ListasDoItem, resto: Partial<ItemPedido> = {}) {
  const item: ItemPedido = {
    ordem,
    exercicioId: SUPINO,
    grupo: null,
    unilateral: false,
    observacoes: null,
    listas: texto,
    ...resto,
  };
  return item;
}

function pedido(...itens: ItemPedido[]): PedidoDeFicha {
  return { nome: 'Ficha', rotinas: [{ nome: 'Segunda', diaDaSemana: 1, itens }] };
}

async function recusa(promessa: Promise<unknown>): Promise<ErroDeValidacao> {
  const erro = await promessa.then(
    () => undefined,
    (e: unknown) => e,
  );
  expect(erro).toBeInstanceOf(ErroDeValidacao);
  return erro as ErroDeValidacao;
}

describe('SalvarFicha: descanso por série (RB06)', () => {
  it('aceita 4 séries com descanso 90/90/90/120 e grava 120 segundos na última', async () => {
    const { caso } = iniciar();

    const { versao } = await caso.executar(
      pedido(itemComListas(1, listas(4, { descanso: '90/90/90/120' }))),
    );

    const series = versao.rotinas[0].itens[0].series;
    expect(series.map((s) => s.descansoSegundos)).toEqual([90, 90, 90, 120]);
  });

  it('um descanso único vale para as séries todas, em segundos ou em minutos e segundos', async () => {
    const { caso } = iniciar();

    const { versao } = await caso.executar(
      pedido(
        itemComListas(1, listas(3, { descanso: '90' })),
        itemComListas(2, listas(2, { descanso: '1:30' })),
      ),
    );

    const [primeiro, segundo] = versao.rotinas[0].itens;
    expect(primeiro.series.map((s) => s.descansoSegundos)).toEqual([90, 90, 90]);
    expect(segundo.series.map((s) => s.descansoSegundos)).toEqual([90, 90]);
  });

  it('bloqueia 3 séries com 4 descansos, indicando a rotina e a linha', async () => {
    const { caso } = iniciar();

    const erro = await recusa(
      caso.executar(pedido(itemComListas(1, listas(3, { descanso: '90/90/90/120' })))),
    );

    expect(erro.campo).toBe('Segunda, linha 1: descanso');
    expect(erro.esperado).toMatch(/3 valores/);
    expect(erro.recebido).toBe('90/90/90/120');
  });

  it('sem descanso informado, as séries ficam sem descanso', async () => {
    const { caso } = iniciar();

    const { versao } = await caso.executar(pedido(itemComListas(1, listas(2))));

    expect(versao.rotinas[0].itens[0].series.map((s) => s.descansoSegundos)).toEqual([null, null]);
  });
});

describe('SalvarFicha: técnica por série (RB06)', () => {
  it('aquecimento/-/-/- deixa a primeira série como aquecimento e as outras três sem técnica', async () => {
    const { caso } = iniciar();

    const { versao } = await caso.executar(
      pedido(itemComListas(1, listas(4, { tecnica: 'aquecimento/-/-/-' }))),
    );

    const series = versao.rotinas[0].itens[0].series;
    expect(series.map((s) => s.tecnica)).toEqual(['aquecimento', null, null, null]);
  });

  it('bloqueia a lista de técnicas com quantidade errada e a técnica fora da lista', async () => {
    const { caso } = iniciar();

    const faltando = await recusa(
      caso.executar(pedido(itemComListas(1, listas(4, { tecnica: '-/-/drop-set' })))),
    );
    const invalida = await recusa(
      caso.executar(pedido(itemComListas(1, listas(2, { tecnica: '-/supersérie' })))),
    );

    expect(faltando.campo).toBe('Segunda, linha 1: técnica');
    expect(invalida.campo).toBe('Segunda, linha 1: técnica');
    expect(invalida.recebido).toBe('supersérie');
  });
});

describe('SalvarFicha: meta e carga por série (RB06)', () => {
  it('lê a meta por série e a carga com vírgula ou ponto', async () => {
    const { caso } = iniciar();

    const { versao } = await caso.executar(
      pedido(itemComListas(1, listas(4, { meta: '12/10/8/falha', carga: '60/62,5/65/65.5' }))),
    );

    const series = versao.rotinas[0].itens[0].series;
    const tipos = ['repeticoes', 'repeticoes', 'repeticoes', 'falha'];
    expect(series.map((s) => s.meta.tipo)).toEqual(tipos);
    expect(series.map((s) => s.meta.minimo)).toEqual([12, 10, 8, null]);
    expect(series.map((s) => s.carga?.gramas)).toEqual([60000, 62500, 65000, 65500]);
  });

  it('bloqueia a lista de metas com quantidade errada, indicando a linha', async () => {
    const { caso } = iniciar();

    const erro = await recusa(
      caso.executar(pedido(itemComListas(1, listas(3, { meta: '12/10' })))),
    );

    expect(erro.campo).toBe('Segunda, linha 1: meta');
  });

  it('bloqueia item com quantidade de séries menor que 1', async () => {
    const { caso } = iniciar();

    const erro = await recusa(caso.executar(pedido(itemComListas(1, listas(0)))));

    expect(erro.campo).toBe('Segunda, linha 1: séries');
  });
});

describe('SalvarFicha: grupos em sequência (RB07, VE17)', () => {
  const comGrupo = (ordem: number, grupo: string | null, exercicioId: Identificador) =>
    itemComListas(ordem, listas(3, { descanso: '0' }), { grupo, exercicioId });

  it('grava a letra nos exercícios consecutivos do bi-set', async () => {
    const { caso } = iniciar();

    const { versao } = await caso.executar(
      pedido(comGrupo(1, null, SUPINO), comGrupo(2, 'A', LATERAL), comGrupo(3, 'A', FRONTAL)),
    );

    const itens = versao.rotinas[0].itens;
    expect(itens.map((i) => i.grupoSequencia)).toEqual([null, 'A', 'A']);
  });

  it('bloqueia letra usada em um só exercício, indicando a linha', async () => {
    const { caso } = iniciar();

    const erro = await recusa(
      caso.executar(pedido(comGrupo(1, 'A', SUPINO), comGrupo(2, null, LATERAL))),
    );

    expect(erro.campo).toBe('Segunda, linha 1: grupo');
    expect(erro.recebido).toBe('A');
  });

  it('bloqueia letra fora de A a Z', async () => {
    const { caso } = iniciar();

    const erro = await recusa(
      caso.executar(pedido(comGrupo(1, '1', SUPINO), comGrupo(2, '1', LATERAL))),
    );

    expect(erro.esperado).toMatch(/letra de A a Z/);
  });

  it('o grupo também vale para séries informadas uma a uma', async () => {
    const { caso } = iniciar();
    const umaASerie = (ordem: number, exercicioId: Identificador): ItemPedido => ({
      ordem,
      exercicioId,
      grupo: 'B',
      unilateral: false,
      observacoes: null,
      series: [{ meta: '10', cargaEmQuilos: null, tecnica: null, descansoSegundos: 0 }],
    });

    const { versao } = await caso.executar(pedido(umaASerie(1, SUPINO), umaASerie(2, LATERAL)));

    expect(versao.rotinas[0].itens.map((i) => i.grupoSequencia)).toEqual(['B', 'B']);
  });
});
