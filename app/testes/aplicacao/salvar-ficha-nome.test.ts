import {
  SalvarFicha,
  type ItemPedido,
  type PedidoDeFicha,
} from '../../src/aplicacao/casos-de-uso/salvar-ficha';
import { ErroDeValidacao } from '../../src/dominio/erro-de-validacao';
import type { ExercicioDoCatalogo } from '../../src/dominio/exercicio';
import { Identificador } from '../../src/dominio/identificador';
import { GeradorDeIdentificadorSequencial } from '../dubles/gerador-de-identificador-sequencial';
import { RelogioFixo } from '../dubles/relogio-fixo';
import { RepositorioDeFichasEmMemoria } from '../dubles/repositorio-de-fichas-em-memoria';
import { RepositorioDoCatalogoEmMemoria } from '../dubles/repositorio-do-catalogo-em-memoria';

const SUPINO = Identificador.de('00000000-0000-7000-8000-0000000c3001');

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

function pedido(nome: string, fichaId?: Identificador): PedidoDeFicha {
  const item: ItemPedido = {
    ordem: 1,
    exercicioId: SUPINO,
    grupo: null,
    unilateral: false,
    observacoes: null,
    series: [{ meta: '10', cargaEmQuilos: null, tecnica: null, descansoSegundos: null }],
  };
  return { fichaId, nome, rotinas: [{ nome: 'Segunda', diaDaSemana: 1, itens: [item] }] };
}

async function recusa(promessa: Promise<unknown>): Promise<ErroDeValidacao> {
  const erro = await promessa.then(
    () => undefined,
    (e: unknown) => e,
  );
  expect(erro).toBeInstanceOf(ErroDeValidacao);
  return erro as ErroDeValidacao;
}

describe('SalvarFicha: nome da ficha (US-007d1)', () => {
  it('numa ficha existente, o nome novo renomeia a ficha junto com a versão seguinte', async () => {
    const { fichas, caso } = iniciar();
    const { fichaId } = await caso.executar(pedido('Treino A'));

    const { versao } = await caso.executar(pedido('Treino B', fichaId));

    expect(versao.numero).toBe(2);
    expect((await fichas.listarFichas()).map((f) => f.nome)).toEqual(['Treino B']);
  });

  it('o nome é aparado, e o mesmo nome deixa a ficha como estava', async () => {
    const { fichas, caso } = iniciar();
    const { fichaId } = await caso.executar(pedido('Treino A'));

    await caso.executar(pedido('  Treino A  ', fichaId));
    await caso.executar(pedido('  Treino C  ', fichaId));

    expect((await fichas.listarFichas()).map((f) => f.nome)).toEqual(['Treino C']);
  });

  it('a ficha nova grava o nome aparado', async () => {
    const { fichas, caso } = iniciar();

    await caso.executar(pedido('  Treino A '));

    expect((await fichas.listarFichas()).map((f) => f.nome)).toEqual(['Treino A']);
  });

  it.each(['', '   '])(
    'recusa o nome %p, dizendo o valor recebido, sem gravar nada',
    async (nome) => {
      const { fichas, caso } = iniciar();
      const { fichaId } = await caso.executar(pedido('Treino A'));

      const erro = await recusa(caso.executar(pedido(nome, fichaId)));

      expect(erro.campo).toBe('nome da ficha');
      expect(erro.recebido).toBe(nome);
      expect(erro.esperado).toMatch(/ao menos 1 caractere/);
      expect((await fichas.listarVersoes(fichaId)).map((v) => v.numero)).toEqual([1]);
      expect((await fichas.listarFichas()).map((f) => f.nome)).toEqual(['Treino A']);
    },
  );

  it('recusa o nome em branco também na ficha nova, sem gravar nada', async () => {
    const { fichas, caso } = iniciar();

    await recusa(caso.executar(pedido('   ')));

    expect(await fichas.listarFichas()).toEqual([]);
  });
});
