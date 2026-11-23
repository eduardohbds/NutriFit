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

const SUPINO = Identificador.de('00000000-0000-7000-8000-0000000c4001');

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

function rotina(nome: string, dia: number, itens: ItemPedido[]): RotinaPedida {
  return { nome, diaDaSemana: dia, itens };
}

function pedido(rotinas: RotinaPedida[], fichaId?: Identificador): PedidoDeFicha {
  return { nome: 'Treino', fichaId, rotinas };
}

async function recusa(promessa: Promise<unknown>): Promise<ErroDeValidacao> {
  const erro = await promessa.then(
    () => undefined,
    (e: unknown) => e,
  );
  expect(erro).toBeInstanceOf(ErroDeValidacao);
  return erro as ErroDeValidacao;
}

describe('SalvarFicha: rotina sem nenhuma linha (US-007d2)', () => {
  it('bloqueia a ficha nova com uma rotina vazia, indicando a rotina, e não grava nada', async () => {
    const { fichas, caso } = iniciar();

    const erro = await recusa(
      caso.executar(pedido([rotina('Segunda', 1, [item]), rotina('Terça', 2, [])])),
    );

    expect(erro.campo).toBe('rotina "Terça"');
    expect(erro.recebido).toBe('0 linhas');
    expect(erro.esperado).toBe('ao menos 1 linha');
    expect(await fichas.listarFichas()).toEqual([]);
  });

  it('bloqueia a versão nova de uma ficha existente e deixa as versões como estavam', async () => {
    const { fichas, caso } = iniciar();
    const { fichaId } = await caso.executar(pedido([rotina('Segunda', 1, [item])]));

    const erro = await recusa(caso.executar(pedido([rotina('Segunda', 1, [])], fichaId)));

    expect(erro.campo).toBe('rotina "Segunda"');
    expect((await fichas.listarVersoes(fichaId)).map((v) => v.numero)).toEqual([1]);
  });

  it('aceita a ficha quando todas as rotinas têm ao menos uma linha', async () => {
    const { caso } = iniciar();

    const { versao } = await caso.executar(
      pedido([rotina('Segunda', 1, [item]), rotina('Terça', 2, [item, { ...item, ordem: 2 }])]),
    );

    expect(versao.rotinas.map((r) => r.itens.length)).toEqual([1, 2]);
  });
});
