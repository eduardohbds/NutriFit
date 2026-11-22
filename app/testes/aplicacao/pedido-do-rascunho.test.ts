import { comTexto, pedidoDoRascunho, rascunhoDaFicha } from '../../src/aplicacao/rascunho-da-ficha';
import { ErroDeValidacao } from '../../src/dominio/erro-de-validacao';
import type { VersaoDaFicha } from '../../src/dominio/ficha';
import { fichasParaTela } from '../apoio/fichas-de-tela';

// O conteúdo da versão sem os identificadores, que mudam a cada gravação.
function conteudoDa(versao: VersaoDaFicha) {
  return versao.rotinas.map((r) => ({
    nome: r.nome,
    diaDaSemana: r.diaDaSemana,
    itens: r.itens.map((i) => ({
      exercicioId: i.exercicioId,
      grupoSequencia: i.grupoSequencia,
      unilateral: i.unilateral,
      observacoes: i.observacoes,
      series: i.series.map((s) => ({
        meta: s.meta,
        carga: s.carga,
        tecnica: s.tecnica,
        descansoSegundos: s.descansoSegundos,
      })),
    })),
  }));
}

async function rascunhoDaCompleta() {
  const pronto = await fichasParaTela();
  const lida = (await pronto.lerFichaParaEdicao.executar(pronto.fichaCompleta))!;
  return { pronto, lida, rascunho: rascunhoDaFicha(lida) };
}

function recusa(fazer: () => unknown): ErroDeValidacao {
  try {
    fazer();
  } catch (e) {
    expect(e).toBeInstanceOf(ErroDeValidacao);
    return e as ErroDeValidacao;
  }
  throw new Error('esperava ErroDeValidacao');
}

describe('pedidoDoRascunho (US-007c3)', () => {
  it('leva o rascunho ao pedido do SalvarFicha, com os textos nas listas e o campo vazio como nulo', async () => {
    const { rascunho } = await rascunhoDaCompleta();

    const pedido = pedidoDoRascunho(rascunho, 'ajuste');

    expect(pedido.fichaId).toEqual(rascunho.fichaId);
    expect(pedido).toMatchObject({ nome: rascunho.nome, motivo: 'ajuste' });
    const [supino, lateral] = pedido.rotinas[0].itens;
    expect(supino.ordem).toBe(1);
    expect(supino.exercicioId).toEqual(rascunho.rotinas[0].itens[0].exercicioId);
    expect(supino.listas).toEqual({
      quantidade: 4,
      meta: '12/10/8/falha',
      carga: '60/62,5/65/65',
      tecnica: 'aquecimento/-/-/-',
      descanso: '90/90/90/120',
    });
    expect(lateral).toMatchObject({ ordem: 2, grupo: 'A', unilateral: true });
    expect(lateral.listas).toMatchObject({ tecnica: null, descanso: '0' });
  });

  it('o motivo em branco vira nulo, e o preenchido é mantido', async () => {
    const { rascunho } = await rascunhoDaCompleta();

    expect(pedidoDoRascunho(rascunho, '   ').motivo).toBeNull();
    expect(pedidoDoRascunho(rascunho, '').motivo).toBeNull();
    expect(pedidoDoRascunho(rascunho, 'subi a carga').motivo).toBe('subi a carga');
  });

  it('a quantidade de séries digitada vira número, sem espaços nas pontas', async () => {
    const { rascunho } = await rascunhoDaCompleta();

    const pedido = pedidoDoRascunho(comTexto(rascunho, 0, 0, 'quantidade', ' 5 '), '');

    expect(pedido.rotinas[0].itens[0].listas?.quantidade).toBe(5);
  });

  it.each(['abc', '0', '', '2.5', '-1'])(
    'recusa %p como quantidade de séries, indicando a rotina e a linha',
    async (texto) => {
      const { rascunho } = await rascunhoDaCompleta();
      const alterado = comTexto(rascunho, 0, 1, 'quantidade', texto);

      const erro = recusa(() => pedidoDoRascunho(alterado, ''));

      expect(erro.campo).toBe('Treino A, linha 2: séries');
      expect(erro.esperado).toMatch(/inteiro maior ou igual a 1/);
      expect(erro.recebido).toBe(texto);
    },
  );

  it('o texto lido de uma ficha, passado pelo rascunho, grava uma versão idêntica', async () => {
    const { pronto, lida, rascunho } = await rascunhoDaCompleta();
    const antes = (await pronto.fichas.buscarVersaoAtual(lida.fichaId))!;

    const { versao } = await pronto.salvarFicha.executar(pedidoDoRascunho(rascunho, ''));

    expect(versao.numero).toBe(antes.numero + 1);
    expect(conteudoDa(versao)).toEqual(conteudoDa(antes));
  });

  it('a DT01 passa pelo rascunho e volta idêntica, com as 30 linhas', async () => {
    const pronto = await fichasParaTela();
    const lida = (await pronto.lerFichaParaEdicao.executar(pronto.fichaDaDt01))!;
    const antes = (await pronto.fichas.buscarVersaoAtual(pronto.fichaDaDt01))!;

    const pedido = pedidoDoRascunho(rascunhoDaFicha(lida), 'sem mudança');
    const { versao } = await pronto.salvarFicha.executar(pedido);

    expect(versao.rotinas.flatMap((r) => r.itens)).toHaveLength(30);
    expect(conteudoDa(versao)).toEqual(conteudoDa(antes));
  });
});
