import { HistoricoDoExercicio } from '../../src/aplicacao/casos-de-uso/historico-do-exercicio';
import { MesclarExercicios } from '../../src/aplicacao/casos-de-uso/mesclar-exercicios';
import { PrepararSerie, type PedidoDeSerie } from '../../src/aplicacao/casos-de-uso/preparar-serie';
import { Carga } from '../../src/dominio/carga';
import { ErroDeValidacao } from '../../src/dominio/erro-de-validacao';
import type { ExercicioDoCatalogo } from '../../src/dominio/exercicio';
import type { SeriePlanejada } from '../../src/dominio/ficha';
import { Identificador } from '../../src/dominio/identificador';
import { InstanteUtc } from '../../src/dominio/instante-utc';
import { MetaDeSerie } from '../../src/dominio/meta-de-serie';
import type { SerieExecutada } from '../../src/dominio/sessao';
import { novoId, registrarSessao, serieDeTrabalho } from '../apoio/historico-de-exemplo';
import { RepositorioDeSessoesEmMemoria } from '../dubles/repositorio-de-sessoes-em-memoria';
import { RepositorioDoCatalogoEmMemoria } from '../dubles/repositorio-do-catalogo-em-memoria';

const SUPINO = Identificador.de('00000000-0000-7000-8000-0000000f0b01');
const PLANO = Identificador.de('00000000-0000-7000-8000-0000000f0b02');
const SESSAO_ATUAL = Identificador.de('00000000-0000-7000-8000-0000000f0b99');

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
  catalogo.semearCatalogo([exercicio(SUPINO, 'Supino Reto'), exercicio(PLANO, 'Supino Plano')]);
  const sessoes = new RepositorioDeSessoesEmMemoria();
  const historico = new HistoricoDoExercicio(catalogo, sessoes);
  return {
    sessoes,
    preparar: new PrepararSerie(historico),
    mesclar: new MesclarExercicios(catalogo),
  };
}

function planejada(
  meta: string,
  extras: { carga?: number; descanso?: number } = {},
): SeriePlanejada {
  const { tipo, minimo, maximo, segundos } = MetaDeSerie.deTexto(meta);
  return {
    id: novoId(),
    meta: { tipo, minimo, maximo, segundos },
    carga: extras.carga === undefined ? null : Carga.deQuilos(extras.carga),
    tecnica: null,
    descansoSegundos: extras.descanso ?? null,
  };
}

function pedido(alteracao: Partial<PedidoDeSerie> = {}): PedidoDeSerie {
  return { exercicioId: SUPINO, sessaoId: SESSAO_ATUAL, posicao: 1, planejadas: [], ...alteracao };
}

const comTipo = (serie: SerieExecutada, tipo: SerieExecutada['tipo']): SerieExecutada => ({
  ...serie,
  tipo,
});

describe('PrepararSerie: sem histórico, os valores vêm da ficha (RF02)', () => {
  it('repetições com carga: série 1 vem com a carga e as repetições da ficha', async () => {
    const { preparar } = iniciar();

    const sugerida = await preparar.executar(
      pedido({ planejadas: [planejada('10', { carga: 60 })] }),
    );

    expect(sugerida.origem).toBe('ficha');
    expect(sugerida.carga?.gramas).toBe(60000);
    expect(sugerida.repeticoes).toBe(10);
    expect(sugerida.segundos).toBeNull();
    expect(sugerida.repeticoesOutroLado).toBeNull();
    expect(sugerida.rir).toBeNull();
  });

  it('faixa 8-12 vem com o mínimo da faixa', async () => {
    const { preparar } = iniciar();

    const sugerida = await preparar.executar(pedido({ planejadas: [planejada('8-12')] }));

    expect(sugerida.repeticoes).toBe(8);
    expect(sugerida.carga).toBeNull();
  });

  it('meta de tempo vem com os segundos, sem repetições', async () => {
    const { preparar } = iniciar();

    const sugerida = await preparar.executar(pedido({ planejadas: [planejada('60s')] }));

    expect(sugerida.segundos).toBe(60);
    expect(sugerida.repeticoes).toBeNull();
  });

  it('meta "falha" vem sem repetições e com RIR 0', async () => {
    const { preparar } = iniciar();

    const sugerida = await preparar.executar(pedido({ planejadas: [planejada('falha')] }));

    expect(sugerida.repeticoes).toBeNull();
    expect(sugerida.rir?.valor).toBe(0);
  });

  it('a série N usa a N-ésima planejada', async () => {
    const { preparar } = iniciar();
    const planejadas = [planejada('10', { carga: 60 }), planejada('8', { carga: 70 })];

    const sugerida = await preparar.executar(pedido({ posicao: 2, planejadas }));

    expect(sugerida.carga?.gramas).toBe(70000);
    expect(sugerida.repeticoes).toBe(8);
  });

  it('sem ficha, ou além das séries planejadas, vem tudo vazio', async () => {
    const { preparar } = iniciar();

    const semFicha = await preparar.executar(pedido());
    const alem = await preparar.executar(pedido({ posicao: 4, planejadas: [planejada('10')] }));

    for (const sugerida of [semFicha, alem]) {
      expect(sugerida).toEqual({
        origem: 'vazia',
        carga: null,
        repeticoes: null,
        repeticoesOutroLado: null,
        segundos: null,
        rir: null,
        descansoDeReferencia: null,
      });
    }
  });
});

describe('PrepararSerie: com histórico, os valores vêm da última sessão do exercício', () => {
  it('usa a sessão mais recente e ignora os valores da ficha', async () => {
    const { sessoes, preparar } = iniciar();
    await registrarSessao(sessoes, SUPINO, '2026-11-03T09:00:00.000Z', [serieDeTrabalho(50)]);
    await registrarSessao(sessoes, SUPINO, '2026-11-10T09:00:00.000Z', [serieDeTrabalho(62.5)]);
    await registrarSessao(sessoes, SUPINO, '2026-11-06T09:00:00.000Z', [serieDeTrabalho(55)]);

    const sugerida = await preparar.executar(
      pedido({ planejadas: [planejada('12', { carga: 40 })] }),
    );

    expect(sugerida.origem).toBe('ultima_sessao');
    expect(sugerida.carga?.gramas).toBe(62500);
    expect(sugerida.repeticoes).toBe(10);
  });

  it('a série N vem da N-ésima série de trabalho da última sessão', async () => {
    const { sessoes, preparar } = iniciar();
    await registrarSessao(sessoes, SUPINO, '2026-11-10T09:00:00.000Z', [
      serieDeTrabalho(60),
      serieDeTrabalho(65),
    ]);

    const segunda = await preparar.executar(pedido({ posicao: 2 }));

    expect(segunda.carga?.gramas).toBe(65000);
  });

  it('se a última sessão teve menos séries, a série além delas repete a última', async () => {
    const { sessoes, preparar } = iniciar();
    await registrarSessao(sessoes, SUPINO, '2026-11-10T09:00:00.000Z', [
      serieDeTrabalho(60),
      serieDeTrabalho(65),
    ]);

    const terceira = await preparar.executar(pedido({ posicao: 3 }));

    expect(terceira.origem).toBe('ultima_sessao');
    expect(terceira.carga?.gramas).toBe(65000);
  });

  it('aquecimento não conta: a série 1 vem da primeira série de trabalho', async () => {
    const { sessoes, preparar } = iniciar();
    await registrarSessao(sessoes, SUPINO, '2026-11-10T09:00:00.000Z', [
      comTipo(serieDeTrabalho(20), 'aquecimento'),
      serieDeTrabalho(60),
    ]);

    const primeira = await preparar.executar(pedido());

    expect(primeira.carga?.gramas).toBe(60000);
  });

  it('uma sessão só de aquecimento não conta como histórico', async () => {
    const { sessoes, preparar } = iniciar();
    await registrarSessao(sessoes, SUPINO, '2026-11-10T09:00:00.000Z', [
      comTipo(serieDeTrabalho(20), 'aquecimento'),
    ]);

    const sugerida = await preparar.executar(
      pedido({ planejadas: [planejada('10', { carga: 40 })] }),
    );

    expect(sugerida.origem).toBe('ficha');
    expect(sugerida.carga?.gramas).toBe(40000);
  });

  it('as repetições do outro lado (unilateral) também vêm preenchidas', async () => {
    const { sessoes, preparar } = iniciar();
    const serie = { ...serieDeTrabalho(12), repeticoes: 10, repeticoesOutroLado: 9 };
    await registrarSessao(sessoes, SUPINO, '2026-11-10T09:00:00.000Z', [serie]);

    const sugerida = await preparar.executar(pedido());

    expect(sugerida.repeticoes).toBe(10);
    expect(sugerida.repeticoesOutroLado).toBe(9);
  });

  it('o RIR nunca é copiado da última sessão: a série vem sem RIR', async () => {
    const { sessoes, preparar } = iniciar();
    await registrarSessao(sessoes, SUPINO, '2026-11-10T09:00:00.000Z', [serieDeTrabalho(60)]);

    const sugerida = await preparar.executar(pedido({ planejadas: [planejada('10')] }));

    expect(sugerida.rir).toBeNull();
  });

  it('meta "falha" na ficha vem com RIR 0, mesmo com histórico', async () => {
    const { sessoes, preparar } = iniciar();
    await registrarSessao(sessoes, SUPINO, '2026-11-10T09:00:00.000Z', [serieDeTrabalho(60)]);

    const sugerida = await preparar.executar(pedido({ planejadas: [planejada('falha')] }));

    expect(sugerida.origem).toBe('ultima_sessao');
    expect(sugerida.rir?.valor).toBe(0);
  });

  it('a sessão em andamento não conta como última sessão', async () => {
    const { sessoes, preparar } = iniciar();
    await registrarSessao(sessoes, SUPINO, '2026-11-03T09:00:00.000Z', [serieDeTrabalho(50)]);
    const { sessaoId } = await registrarSessao(sessoes, SUPINO, '2026-11-12T09:00:00.000Z', [
      serieDeTrabalho(80),
    ]);

    const sugerida = await preparar.executar(pedido({ sessaoId }));

    expect(sugerida.carga?.gramas).toBe(50000);
  });

  it('se só a sessão em andamento tem séries, os valores vêm da ficha', async () => {
    const { sessoes, preparar } = iniciar();
    const { sessaoId } = await registrarSessao(sessoes, SUPINO, '2026-11-12T09:00:00.000Z', [
      serieDeTrabalho(80),
    ]);

    const sugerida = await preparar.executar(
      pedido({ sessaoId, planejadas: [planejada('10', { carga: 40 })] }),
    );

    expect(sugerida.origem).toBe('ficha');
    expect(sugerida.carga?.gramas).toBe(40000);
  });

  it('série corrigida vale pela corrigida, e a removida não conta', async () => {
    const { sessoes, preparar } = iniciar();
    const errada = serieDeTrabalho(60);
    await registrarSessao(sessoes, SUPINO, '2026-11-10T09:00:00.000Z', [errada]);
    const certa = { ...serieDeTrabalho(65), id: novoId() };
    await sessoes.corrigirSerie(errada.id, certa, InstanteUtc.de('2026-11-10T09:30:00.000Z'));

    const sugerida = await preparar.executar(pedido());

    expect(sugerida.carga?.gramas).toBe(65000);
  });

  it('depois de mesclar dois exercícios, a última sessão de qualquer um dos dois vale', async () => {
    const { sessoes, preparar, mesclar } = iniciar();
    await registrarSessao(sessoes, SUPINO, '2026-11-03T09:00:00.000Z', [serieDeTrabalho(50)]);
    await registrarSessao(sessoes, PLANO, '2026-11-10T09:00:00.000Z', [serieDeTrabalho(57.5)]);
    await mesclar.executar({ mantidoId: SUPINO, descartadoId: PLANO });

    const pelMantido = await preparar.executar(pedido({ exercicioId: SUPINO }));
    const peloDescartado = await preparar.executar(pedido({ exercicioId: PLANO }));

    expect(pelMantido.carga?.gramas).toBe(57500);
    expect(peloDescartado.carga?.gramas).toBe(57500);
  });

  it('outro exercício não interfere', async () => {
    const { sessoes, preparar } = iniciar();
    await registrarSessao(sessoes, PLANO, '2026-11-10T09:00:00.000Z', [serieDeTrabalho(57.5)]);

    const sugerida = await preparar.executar(pedido({ exercicioId: SUPINO }));

    expect(sugerida.origem).toBe('vazia');
  });
});

describe('PrepararSerie: o descanso planejado aparece como referência, sem cronômetro', () => {
  const planejadas = [
    planejada('10', { descanso: 90 }),
    planejada('10'),
    planejada('10', { descanso: 120 }),
  ];

  it('a série 1 não tem descanso de referência', async () => {
    const { preparar } = iniciar();

    expect((await preparar.executar(pedido({ planejadas }))).descansoDeReferencia).toBeNull();
  });

  it('a série 2 mostra o descanso planejado depois da série 1', async () => {
    const { preparar } = iniciar();

    const sugerida = await preparar.executar(pedido({ posicao: 2, planejadas }));

    expect(sugerida.descansoDeReferencia).toBe(90);
  });

  it('descanso não informado na série anterior fica em branco', async () => {
    const { preparar } = iniciar();

    const sugerida = await preparar.executar(pedido({ posicao: 3, planejadas }));

    expect(sugerida.descansoDeReferencia).toBeNull();
  });

  it('a série além das planejadas mostra o descanso da última planejada, e depois dela, nada', async () => {
    const { preparar } = iniciar();

    const quarta = await preparar.executar(pedido({ posicao: 4, planejadas }));
    const quinta = await preparar.executar(pedido({ posicao: 5, planejadas }));

    expect(quarta.descansoDeReferencia).toBe(120);
    expect(quinta.descansoDeReferencia).toBeNull();
  });

  it('o descanso vem da ficha também quando os valores vêm do histórico', async () => {
    const { sessoes, preparar } = iniciar();
    await registrarSessao(sessoes, SUPINO, '2026-11-10T09:00:00.000Z', [
      serieDeTrabalho(60),
      serieDeTrabalho(60),
    ]);

    const sugerida = await preparar.executar(pedido({ posicao: 2, planejadas }));

    expect(sugerida.origem).toBe('ultima_sessao');
    expect(sugerida.descansoDeReferencia).toBe(90);
  });

  it('sem ficha, não há descanso de referência', async () => {
    const { preparar } = iniciar();

    expect((await preparar.executar(pedido({ posicao: 2 }))).descansoDeReferencia).toBeNull();
  });
});

describe('PrepararSerie: pedido inválido e só leitura', () => {
  it.each([0, -1, 1.5, Number.NaN])(
    'posição %p é recusada, com o valor recebido',
    async (posicao) => {
      const { preparar } = iniciar();

      const falha = await preparar.executar(pedido({ posicao })).catch((erro: unknown) => erro);

      expect(falha).toBeInstanceOf(ErroDeValidacao);
      expect(falha).toMatchObject({ campo: 'posição', recebido: posicao });
      expect((falha as ErroDeValidacao).esperado).toBe('inteiro maior ou igual a 1');
    },
  );

  it('não grava nada: as sessões ficam como estavam', async () => {
    const { sessoes, preparar } = iniciar();
    const { sessaoId } = await registrarSessao(sessoes, SUPINO, '2026-11-10T09:00:00.000Z', [
      serieDeTrabalho(60),
    ]);
    const antes = await sessoes.buscarSessao(sessaoId);

    await preparar.executar(pedido({ posicao: 2, planejadas: [planejada('10')] }));

    expect(await sessoes.buscarSessao(sessaoId)).toEqual(antes);
  });
});
