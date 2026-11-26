import { EscolherTreinoDoDia } from '../../src/aplicacao/casos-de-uso/escolher-treino-do-dia';
import type { PedidoDeFicha } from '../../src/aplicacao/casos-de-uso/salvar-ficha';
import type { Identificador } from '../../src/dominio/identificador';
import { InstanteUtc } from '../../src/dominio/instante-utc';
import type { SituacaoDaSessao } from '../../src/dominio/sessao';
import { fichasParaTela } from '../apoio/fichas-de-tela';
import { FabricaDeSessoes } from '../apoio/sessao-de-exemplo';
import { RelogioFixo } from '../dubles/relogio-fixo';
import { RepositorioDeSessoesEmMemoria } from '../dubles/repositorio-de-sessoes-em-memoria';

// Novembro de 2026: 9 é segunda, 11 é quarta, 14 é sábado e 15 é domingo.
const dia = (numero: number) => `2026-11-${String(numero).padStart(2, '0')}T12:00:00.000Z`;

async function iniciar(hoje = dia(11)) {
  const pronto = await fichasParaTela();
  const sessoes = new RepositorioDeSessoesEmMemoria();
  const caso = new EscolherTreinoDoDia(pronto.fichas, sessoes, new RelogioFixo(hoje));
  const fabrica = new FabricaDeSessoes(pronto.ids.get('Supino Reto')!);
  return { ...pronto, sessoes, caso, fabrica };
}

type Iniciado = Awaited<ReturnType<typeof iniciar>>;

// Ficha por rotação com Treino A, B e C, ainda inativa.
async function criarRotacao(pronto: Iniciado, nomes = ['Treino A', 'Treino B', 'Treino C']) {
  const supino = pronto.ids.get('Supino Reto')!;
  const rotinas = nomes.map((nome) => ({
    nome,
    diaDaSemana: null,
    itens: [
      {
        ordem: 1,
        exercicioId: supino,
        grupo: null,
        unilateral: false,
        observacoes: null,
        listas: { quantidade: 3, meta: '10', carga: null, tecnica: null, descanso: null },
      },
    ],
  }));
  const pedido: PedidoDeFicha = { nome: 'Rotação ABC', rotinas };
  return (await pronto.salvarFicha.executar(pedido)).fichaId;
}

async function ativarRotacao(pronto: Iniciado) {
  const fichaId = await criarRotacao(pronto);
  await pronto.ativarFicha.executar(fichaId);
  return fichaId;
}

// Registra uma sessão da ficha na rotina de nome dado, com o fim e a situação informados.
async function registrarSessao(
  pronto: Iniciado,
  fichaId: Identificador,
  nomeDaRotina: string,
  fim: string,
  situacao: SituacaoDaSessao = 'concluida',
) {
  const versao = (await pronto.fichas.buscarVersaoAtual(fichaId))!;
  const rotina = versao.rotinas.find((r) => r.nome === nomeDaRotina)!;
  await pronto.sessoes.iniciarSessao({
    ...pronto.fabrica.sessao({ fichaId, versaoId: versao.id, rotinaId: rotina.id }),
    situacao,
    fim: InstanteUtc.de(fim),
  });
}

describe('EscolherTreinoDoDia: ficha por dia da semana (US-012a, RF01)', () => {
  it('numa quarta sugere a rotina de quarta, com as rotinas da ficha para escolher outra', async () => {
    const pronto = await iniciar(dia(11));
    await pronto.ativarFicha.executar(pronto.fichaDaDt01);

    const treino = await pronto.caso.executar();

    expect(treino).toMatchObject({
      situacao: 'sugerido',
      fichaId: pronto.fichaDaDt01,
      fichaNome: 'Ficha de referência (DT01)',
      versao: 1,
    });
    if (treino.situacao !== 'sugerido') throw new Error('esperava sugerido');
    expect(treino.sugerida).toMatchObject({
      nome: 'Quarta',
      diaDaSemana: 3,
      quantidadeDeExercicios: 6,
    });
    expect(treino.rotinas.map((r) => r.nome)).toEqual([
      'Segunda',
      'Terça',
      'Quarta',
      'Quinta',
      'Sexta',
    ]);
    const versao = (await pronto.fichas.buscarVersaoAtual(pronto.fichaDaDt01))!;
    expect(treino.sugerida.id).toEqual(versao.rotinas[2].id);
  });

  it.each([
    [9, 'Segunda'],
    [10, 'Terça'],
    [11, 'Quarta'],
    [12, 'Quinta'],
    [13, 'Sexta'],
  ])('no dia %i de novembro sugere a rotina de %s', async (numero, nome) => {
    const pronto = await iniciar(dia(numero));
    await pronto.ativarFicha.executar(pronto.fichaDaDt01);

    const treino = await pronto.caso.executar();

    expect(treino).toMatchObject({ situacao: 'sugerido', sugerida: { nome } });
  });

  it.each([
    [14, 6],
    [15, 7],
  ])(
    'no dia %i, sem rotina, devolve o aviso com o dia e todas as rotinas (CE01)',
    async (numero, semana) => {
      const pronto = await iniciar(dia(numero));
      await pronto.ativarFicha.executar(pronto.fichaDaDt01);

      const treino = await pronto.caso.executar();

      expect(treino).toMatchObject({
        situacao: 'sem_rotina_hoje',
        fichaNome: 'Ficha de referência (DT01)',
        versao: 1,
        diaDaSemana: semana,
      });
      if (treino.situacao !== 'sem_rotina_hoje') throw new Error('esperava sem_rotina_hoje');
      expect(treino.rotinas.map((r) => r.nome)).toEqual([
        'Segunda',
        'Terça',
        'Quarta',
        'Quinta',
        'Sexta',
      ]);
    },
  );

  it('usa a versão atual da ficha', async () => {
    const pronto = await iniciar(dia(11));
    await pronto.ativarFicha.executar(pronto.fichaDaDt01);
    const lida = (await pronto.lerFichaParaEdicao.executar(pronto.fichaDaDt01))!;
    await pronto.salvarFicha.executar({
      fichaId: pronto.fichaDaDt01,
      nome: lida.nome,
      rotinas: lida.rotinas.map((r) => ({
        nome: r.nome,
        diaDaSemana: r.diaDaSemana,
        itens: r.itens.map((i) => ({ ...i, listas: i.listas })),
      })),
    });

    const treino = await pronto.caso.executar();

    expect(treino).toMatchObject({ situacao: 'sugerido', versao: 2 });
  });
});

describe('EscolherTreinoDoDia: ficha por rotação (US-012a)', () => {
  it('sem nenhuma sessão concluída sugere a primeira rotina', async () => {
    const pronto = await iniciar();
    await ativarRotacao(pronto);

    const treino = await pronto.caso.executar();

    expect(treino).toMatchObject({ situacao: 'sugerido', sugerida: { nome: 'Treino A' } });
  });

  it.each([
    ['Treino A', 'Treino B'],
    ['Treino B', 'Treino C'],
    ['Treino C', 'Treino A'],
  ])(
    'com a última sessão concluída em %s sugere %s, e depois da última volta à primeira',
    async (ultima, esperada) => {
      const pronto = await iniciar();
      const fichaId = await ativarRotacao(pronto);
      await registrarSessao(pronto, fichaId, ultima, '2026-11-10T10:00:00.000Z');

      const treino = await pronto.caso.executar();

      expect(treino).toMatchObject({ situacao: 'sugerido', sugerida: { nome: esperada } });
    },
  );

  it('a rotação segue a sessão mais recente, e não a ordem em que foram gravadas', async () => {
    const pronto = await iniciar();
    const fichaId = await ativarRotacao(pronto);
    await registrarSessao(pronto, fichaId, 'Treino B', '2026-11-12T10:00:00.000Z');
    await registrarSessao(pronto, fichaId, 'Treino A', '2026-11-10T10:00:00.000Z');

    const treino = await pronto.caso.executar();

    expect(treino).toMatchObject({ sugerida: { nome: 'Treino C' } });
  });

  it.each(['em_andamento', 'parcial', 'descartada'] as const)(
    'sessão %s não avança a rotação: vale a última concluída',
    async (situacao) => {
      const pronto = await iniciar();
      const fichaId = await ativarRotacao(pronto);
      await registrarSessao(pronto, fichaId, 'Treino B', '2026-11-10T10:00:00.000Z');
      await registrarSessao(pronto, fichaId, 'Treino C', '2026-11-12T10:00:00.000Z', situacao);

      const treino = await pronto.caso.executar();

      expect(treino).toMatchObject({ sugerida: { nome: 'Treino C' } });
    },
  );

  it('a sessão de outra ficha não avança a rotação', async () => {
    const pronto = await iniciar();
    await ativarRotacao(pronto);
    await registrarSessao(pronto, pronto.fichaDaDt01, 'Segunda', '2026-11-12T10:00:00.000Z');

    const treino = await pronto.caso.executar();

    expect(treino).toMatchObject({ sugerida: { nome: 'Treino A' } });
  });

  it('a rotação continua depois de a ficha ser editada, porque a rotina se casa pelo nome', async () => {
    const pronto = await iniciar();
    const fichaId = await ativarRotacao(pronto);
    await registrarSessao(pronto, fichaId, 'Treino B', '2026-11-10T10:00:00.000Z');
    const lida = (await pronto.lerFichaParaEdicao.executar(fichaId))!;
    await pronto.salvarFicha.executar({
      fichaId,
      nome: lida.nome,
      rotinas: lida.rotinas.map((r) => ({
        nome: r.nome,
        diaDaSemana: r.diaDaSemana,
        itens: r.itens.map((i) => ({ ...i, listas: i.listas })),
      })),
    });

    const treino = await pronto.caso.executar();

    expect(treino).toMatchObject({
      situacao: 'sugerido',
      versao: 2,
      sugerida: { nome: 'Treino C' },
    });
  });

  it('se o nome da última rotina feita sumiu da versão atual, sugere a primeira', async () => {
    const pronto = await iniciar();
    const fichaId = await ativarRotacao(pronto);
    await registrarSessao(pronto, fichaId, 'Treino B', '2026-11-10T10:00:00.000Z');
    const lida = (await pronto.lerFichaParaEdicao.executar(fichaId))!;
    await pronto.salvarFicha.executar({
      fichaId,
      nome: lida.nome,
      rotinas: lida.rotinas
        .filter((r) => r.nome !== 'Treino B')
        .map((r) => ({ nome: r.nome, diaDaSemana: r.diaDaSemana, itens: r.itens })),
    });

    const treino = await pronto.caso.executar();

    expect(treino).toMatchObject({ situacao: 'sugerido', sugerida: { nome: 'Treino A' } });
  });

  it('a rotação não depende do dia da semana', async () => {
    const pronto = await iniciar(dia(15));
    await ativarRotacao(pronto);

    const treino = await pronto.caso.executar();

    expect(treino).toMatchObject({ situacao: 'sugerido', sugerida: { nome: 'Treino A' } });
  });
});

describe('EscolherTreinoDoDia: sem ficha ativa (US-012a, CE02, SL18)', () => {
  it('sem nenhuma ficha, ou só com inativas ou arquivadas, devolve sem_ficha_ativa', async () => {
    const pronto = await iniciar();

    expect(await pronto.caso.executar()).toEqual({ situacao: 'sem_ficha_ativa' });

    await pronto.ativarFicha.executar(pronto.fichaDaDt01);
    await pronto.arquivarFicha.executar(pronto.fichaDaDt01);
    expect(await pronto.caso.executar()).toEqual({ situacao: 'sem_ficha_ativa' });
  });

  it('vale a ficha ativa, mesmo havendo outras', async () => {
    const pronto = await iniciar(dia(11));
    await pronto.ativarFicha.executar(pronto.fichaCompleta);

    const treino = await pronto.caso.executar();

    expect(treino).toMatchObject({ fichaId: pronto.fichaCompleta });
  });
});

describe('EscolherTreinoDoDia: só lê e é determinístico (US-012a)', () => {
  it('o mesmo relógio fixo dá sempre o mesmo resultado, e outro dia dá outro', async () => {
    const pronto = await iniciar(dia(11));
    await pronto.ativarFicha.executar(pronto.fichaDaDt01);

    const primeiro = await pronto.caso.executar();
    const segundo = await pronto.caso.executar();
    const outroDia = await new EscolherTreinoDoDia(
      pronto.fichas,
      pronto.sessoes,
      new RelogioFixo(dia(12)),
    ).executar();

    expect(segundo).toEqual(primeiro);
    expect(outroDia).toMatchObject({ sugerida: { nome: 'Quinta' } });
  });

  it('escolher outra rotina não cria versão: o caso de uso não grava nada', async () => {
    const pronto = await iniciar(dia(11));
    await pronto.ativarFicha.executar(pronto.fichaDaDt01);
    const versoesAntes = await pronto.fichas.listarVersoes(pronto.fichaDaDt01);
    const fichasAntes = await pronto.fichas.listarFichas();

    const treino = await pronto.caso.executar();
    if (treino.situacao !== 'sugerido') throw new Error('esperava sugerido');
    const outra = treino.rotinas.find((r) => r.nome === 'Sexta');

    expect(outra).toBeDefined();
    expect(await pronto.fichas.listarVersoes(pronto.fichaDaDt01)).toEqual(versoesAntes);
    expect(await pronto.fichas.listarFichas()).toEqual(fichasAntes);
  });
});
