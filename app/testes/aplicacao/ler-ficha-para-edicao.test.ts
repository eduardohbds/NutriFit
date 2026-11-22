import type { PedidoDeFicha } from '../../src/aplicacao/casos-de-uso/salvar-ficha';
import { SalvarFicha } from '../../src/aplicacao/casos-de-uso/salvar-ficha';
import type { FichaParaEdicao } from '../../src/aplicacao/casos-de-uso/ler-ficha-para-edicao';
import type { VersaoDaFicha } from '../../src/dominio/ficha';
import { Identificador } from '../../src/dominio/identificador';
import { fichasParaTela } from '../apoio/fichas-de-tela';
import { GeradorDeIdentificadorSequencial } from '../dubles/gerador-de-identificador-sequencial';
import { RelogioFixo } from '../dubles/relogio-fixo';

// Devolve a ficha lida ao pedido do SalvarFicha, como a tela de edição fará (US-007c2 e c3).
function pedidoDaFichaLida(ficha: FichaParaEdicao): PedidoDeFicha {
  return {
    fichaId: ficha.fichaId,
    nome: ficha.nome,
    rotinas: ficha.rotinas.map((r) => ({
      nome: r.nome,
      diaDaSemana: r.diaDaSemana,
      itens: r.itens.map((i) => ({
        ordem: i.ordem,
        exercicioId: i.exercicioId,
        grupo: i.grupo,
        unilateral: i.unilateral,
        observacoes: i.observacoes,
        listas: i.listas,
      })),
    })),
  };
}

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

describe('LerFichaParaEdicao (US-007c1)', () => {
  it('devolve a DT01 com 5 rotinas por dia da semana e 6 linhas em cada, na ordem da ficha', async () => {
    const { lerFichaParaEdicao, fichaDaDt01 } = await fichasParaTela();

    const ficha = await lerFichaParaEdicao.executar(fichaDaDt01);

    expect(ficha).toMatchObject({ nome: 'Ficha de referência (DT01)', situacao: 'inativa' });
    expect(ficha?.versaoAtual).toBe(1);
    expect(ficha?.rotinas.map((r) => [r.nome, r.diaDaSemana, r.itens.length])).toEqual([
      ['Segunda', 1, 6],
      ['Terça', 2, 6],
      ['Quarta', 3, 6],
      ['Quinta', 4, 6],
      ['Sexta', 5, 6],
    ]);
    expect(ficha?.rotinas[0].itens.map((i) => i.ordem)).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it('cada linha traz o nome do exercício do catálogo, mesmo quando a ficha usou um sinônimo', async () => {
    const { lerFichaParaEdicao, fichaDaDt01 } = await fichasParaTela();

    const ficha = await lerFichaParaEdicao.executar(fichaDaDt01);

    const quarta = ficha?.rotinas[2].itens.map((i) => i.exercicioNome);
    const sexta = ficha?.rotinas[4].itens.map((i) => i.exercicioNome);
    expect(quarta?.[5]).toBe('Rosca de Punho Inversa');
    expect(sexta?.[0]).toBe('Esteira');
    expect(ficha?.rotinas[0].itens[0].exercicioNome).toBe('Supino Reto');
  });

  it('cada linha traz séries, meta, carga, técnica e descanso no texto da planilha', async () => {
    const { lerFichaParaEdicao, fichaCompleta } = await fichasParaTela();

    const ficha = await lerFichaParaEdicao.executar(fichaCompleta);

    const [supino, lateral, frontal] = ficha!.rotinas[0].itens;
    expect(supino.listas).toEqual({
      quantidade: 4,
      meta: '12/10/8/falha',
      carga: '60/62,5/65/65',
      tecnica: 'aquecimento/-/-/-',
      descanso: '90/90/90/120',
    });
    expect([lateral.grupo, frontal.grupo]).toEqual(['A', 'A']);
    expect(lateral.unilateral).toBe(true);
    expect(lateral.observacoes).toBe('Bi-set com a elevação frontal');
    expect(lateral.listas).toEqual({
      quantidade: 3,
      meta: '15',
      carga: '8',
      tecnica: null,
      descanso: '0',
    });
  });

  it('lê a versão atual, a de maior número', async () => {
    const { lerFichaParaEdicao, fichaCompleta } = await fichasParaTela();

    const ficha = await lerFichaParaEdicao.executar(fichaCompleta);

    expect(ficha?.versaoAtual).toBe(2);
  });

  it('o texto lido volta para o SalvarFicha e grava uma versão idêntica, sem perder nada', async () => {
    const { fichas, catalogo, lerFichaParaEdicao, fichaDaDt01, fichaCompleta } =
      await fichasParaTela();
    const salvar = new SalvarFicha(
      fichas,
      catalogo,
      new GeradorDeIdentificadorSequencial(),
      new RelogioFixo(),
    );

    for (const id of [fichaDaDt01, fichaCompleta]) {
      const antes = (await fichas.buscarVersaoAtual(id))!;
      const lida = (await lerFichaParaEdicao.executar(id))!;

      const { versao } = await salvar.executar(pedidoDaFichaLida(lida));

      expect(versao.numero).toBe(antes.numero + 1);
      expect(conteudoDa(versao)).toEqual(conteudoDa(antes));
    }
  });

  it('ficha que não existe devolve nulo', async () => {
    const { lerFichaParaEdicao } = await fichasParaTela();
    const inexistente = Identificador.de('00000000-0000-7000-8000-00000000ffff');

    expect(await lerFichaParaEdicao.executar(inexistente)).toBeNull();
  });
});
