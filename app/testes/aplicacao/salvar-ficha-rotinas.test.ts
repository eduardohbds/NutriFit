import {
  SalvarFicha,
  type ItemPedido,
  type PedidoDeFicha,
  type RotinaPedida,
} from '../../src/aplicacao/casos-de-uso/salvar-ficha';
import { ErroDeValidacao } from '../../src/dominio/erro-de-validacao';
import type { ExercicioDoCatalogo } from '../../src/dominio/exercicio';
import { Identificador } from '../../src/dominio/identificador';
import { GeradorDeIdentificadorSequencial } from '../dubles/gerador-de-identificador-sequencial';
import { RelogioFixo } from '../dubles/relogio-fixo';
import { RepositorioDeFichasEmMemoria } from '../dubles/repositorio-de-fichas-em-memoria';
import { RepositorioDoCatalogoEmMemoria } from '../dubles/repositorio-do-catalogo-em-memoria';

const SUPINO = Identificador.de('00000000-0000-7000-8000-0000000c5001');

const exercicio: ExercicioDoCatalogo = {
  id: SUPINO,
  nome: 'Supino Reto',
  situacao: 'ativo',
  origem: 'inicial',
  unilateral: false,
  equipamento: null,
  sinonimos: [],
  gruposDiretos: ['Peitoral'],
  gruposIndiretos: [],
};

function iniciar() {
  const catalogo = new RepositorioDoCatalogoEmMemoria();
  catalogo.semearCatalogo([exercicio]);
  const fichas = new RepositorioDeFichasEmMemoria();
  const gerador = new GeradorDeIdentificadorSequencial();
  return { fichas, caso: new SalvarFicha(fichas, catalogo, gerador, new RelogioFixo()) };
}

const item: ItemPedido = {
  ordem: 1,
  exercicioId: SUPINO,
  grupo: null,
  unilateral: false,
  observacoes: null,
  series: [{ meta: '10', cargaEmQuilos: null, tecnica: null, descansoSegundos: null }],
};

const rotina = (nome: string, dia: number | null): RotinaPedida => ({
  nome,
  diaDaSemana: dia,
  itens: [item],
});

const pedido = (rotinas: RotinaPedida[], fichaId?: Identificador): PedidoDeFicha => ({
  nome: 'Treino',
  fichaId,
  rotinas,
});

async function recusa(promessa: Promise<unknown>): Promise<ErroDeValidacao> {
  const erro = await promessa.then(
    () => undefined,
    (e: unknown) => e,
  );
  expect(erro).toBeInstanceOf(ErroDeValidacao);
  return erro as ErroDeValidacao;
}

describe('SalvarFicha: ficha sem nenhuma rotina (US-007d3)', () => {
  it('bloqueia a ficha nova sem rotinas, e a ficha existente deixa as versões como estavam', async () => {
    const { fichas, caso } = iniciar();

    const nova = await recusa(caso.executar(pedido([])));
    const { fichaId } = await caso.executar(pedido([rotina('Segunda', 1)]));
    const existente = await recusa(caso.executar(pedido([], fichaId)));

    expect(nova.campo).toBe('rotinas');
    expect(existente.recebido).toBe('0 rotinas');
    expect(existente.esperado).toBe('ao menos 1 rotina');
    expect((await fichas.listarVersoes(fichaId)).map((v) => v.numero)).toEqual([1]);
    expect(await fichas.listarFichas()).toHaveLength(1);
  });
});

describe('SalvarFicha: nome da rotina (US-007d3)', () => {
  it('bloqueia o nome em branco indicando a rotina pela posição, e não grava nada', async () => {
    const { fichas, caso } = iniciar();

    const erro = await recusa(
      caso.executar(pedido([rotina('Segunda', 1), rotina('   ', 2), rotina('Quarta', 3)])),
    );

    expect(erro.campo).toBe('rotina 2: nome');
    expect(erro.recebido).toBe('   ');
    expect(erro.esperado).toMatch(/ao menos 1 caractere/);
    expect(await fichas.listarFichas()).toEqual([]);
  });

  it('apara o nome da rotina na versão gravada', async () => {
    const { caso } = iniciar();

    const { versao } = await caso.executar(pedido([rotina('  Treino de Peito ', 1)]));

    expect(versao.rotinas.map((r) => r.nome)).toEqual(['Treino de Peito']);
  });
});
