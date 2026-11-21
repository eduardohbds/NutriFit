import { HistoricoDoExercicio } from '../../src/aplicacao/casos-de-uso/historico-do-exercicio';
import { MesclarExercicios } from '../../src/aplicacao/casos-de-uso/mesclar-exercicios';
import type { ExercicioDoCatalogo } from '../../src/dominio/exercicio';
import { Identificador } from '../../src/dominio/identificador';
import { InstanteUtc } from '../../src/dominio/instante-utc';
import { idsDasSeries, registrarSessao, serieDeTrabalho } from '../apoio/historico-de-exemplo';
import { RepositorioDeSessoesEmMemoria } from '../dubles/repositorio-de-sessoes-em-memoria';
import { RepositorioDoCatalogoEmMemoria } from '../dubles/repositorio-do-catalogo-em-memoria';

const MANTIDO = Identificador.de('00000000-0000-7000-8000-0000000f0a01');
const DESCARTADO = Identificador.de('00000000-0000-7000-8000-0000000f0a02');
const OUTRO = Identificador.de('00000000-0000-7000-8000-0000000f0a03');

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
  catalogo.semearCatalogo([
    exercicio(MANTIDO, 'Supino Reto'),
    exercicio(DESCARTADO, 'Supino Plano'),
    exercicio(OUTRO, 'Remada Curvada'),
  ]);
  const sessoes = new RepositorioDeSessoesEmMemoria();
  return {
    sessoes,
    historico: new HistoricoDoExercicio(catalogo, sessoes),
    mesclar: new MesclarExercicios(catalogo),
  };
}

describe('HistoricoDoExercicio', () => {
  it('depois da mesclagem, o mantido e o descartado trazem as séries dos dois, sem perder nenhuma', async () => {
    const { sessoes, historico, mesclar } = iniciar();
    const [m1, m2, d1] = [serieDeTrabalho(60), serieDeTrabalho(62.5), serieDeTrabalho(55)];
    await registrarSessao(sessoes, MANTIDO, '2026-11-10T09:00:00.000Z', [m1, m2]);
    await registrarSessao(sessoes, DESCARTADO, '2026-11-11T09:00:00.000Z', [d1]);
    const totalAntes =
      (await historico.executar(MANTIDO)).length + (await historico.executar(DESCARTADO)).length;

    await mesclar.executar({ mantidoId: MANTIDO, descartadoId: DESCARTADO });

    const peloMantido = await historico.executar(MANTIDO);
    const peloDescartado = await historico.executar(DESCARTADO);
    expect(peloMantido).toHaveLength(totalAntes);
    expect(idsDasSeries(peloMantido)).toEqual([m1.id.valor, m2.id.valor, d1.id.valor]);
    expect(idsDasSeries(peloDescartado)).toEqual(idsDasSeries(peloMantido));
  });

  it('só as séries ativas entram na contagem: a antiga de uma correção fica de fora', async () => {
    const { sessoes, historico, mesclar } = iniciar();
    const [m1, d1, d1corrigida] = [serieDeTrabalho(60), serieDeTrabalho(55), serieDeTrabalho(57.5)];
    await registrarSessao(sessoes, MANTIDO, '2026-11-10T09:00:00.000Z', [m1]);
    await registrarSessao(sessoes, DESCARTADO, '2026-11-11T09:00:00.000Z', [d1]);
    await sessoes.corrigirSerie(d1.id, d1corrigida, InstanteUtc.de('2026-11-11T10:00:00.000Z'));

    await mesclar.executar({ mantidoId: MANTIDO, descartadoId: DESCARTADO });

    const ids = idsDasSeries(await historico.executar(MANTIDO));
    expect(ids).toEqual([m1.id.valor, d1corrigida.id.valor]);
  });

  it('um exercício nunca mesclado traz só as séries dele, como antes', async () => {
    const { sessoes, historico, mesclar } = iniciar();
    const outra = serieDeTrabalho(80);
    await registrarSessao(sessoes, MANTIDO, '2026-11-10T09:00:00.000Z', [serieDeTrabalho(60)]);
    await registrarSessao(sessoes, DESCARTADO, '2026-11-11T09:00:00.000Z', [serieDeTrabalho(55)]);
    await registrarSessao(sessoes, OUTRO, '2026-11-12T09:00:00.000Z', [outra]);
    await mesclar.executar({ mantidoId: MANTIDO, descartadoId: DESCARTADO });

    expect(idsDasSeries(await historico.executar(OUTRO))).toEqual([outra.id.valor]);
    expect(await historico.executar(MANTIDO)).toHaveLength(2);
  });
});
