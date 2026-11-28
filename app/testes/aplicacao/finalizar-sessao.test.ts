import { FinalizarSessao } from '../../src/aplicacao/casos-de-uso/finalizar-sessao';
import { IniciarSessao } from '../../src/aplicacao/casos-de-uso/iniciar-sessao';
import { ErroDeValidacao } from '../../src/dominio/erro-de-validacao';
import type { Identificador } from '../../src/dominio/identificador';
import { fichasParaTela } from '../apoio/fichas-de-tela';
import { QUARTA } from '../apoio/inicio-de-tela';
import { FabricaDeSessoes } from '../apoio/sessao-de-exemplo';
import { RelogioFixo } from '../dubles/relogio-fixo';
import { RepositorioDeSessoesEmMemoria } from '../dubles/repositorio-de-sessoes-em-memoria';

const FIM = '2026-11-11T13:15:30.000Z';

async function preparar() {
  const pronto = await fichasParaTela();
  await pronto.ativarFicha.executar(pronto.fichaDaDt01);
  const sessoes = new RepositorioDeSessoesEmMemoria();
  const versao = (await pronto.fichas.buscarVersaoAtual(pronto.fichaDaDt01))!;
  const rotina = versao.rotinas.find((r) => r.nome === 'Quarta')!;
  const inicio = new IniciarSessao(pronto.fichas, sessoes, new RelogioFixo(QUARTA), pronto.gerador);
  const iniciada = await inicio.executar(rotina.id);
  if (!iniciada.iniciada) throw new Error('esperava sessão iniciada');
  const finalizar = new FinalizarSessao(sessoes, pronto.catalogo, new RelogioFixo(FIM));
  const fabrica = new FabricaDeSessoes(pronto.ids.get('Supino Reto')!);
  const serie = (opcoes = { cargaEmQuilos: 40, repeticoes: 10, rir: 2 }) => fabrica.serie(opcoes);
  const exercicios = iniciada.exerciciosDaSessao;
  return { sessoes, finalizar, serie, exercicios, sessaoId: iniciada.sessaoId, pronto };
}

async function lida(sessoes: RepositorioDeSessoesEmMemoria, id: Identificador) {
  return (await sessoes.buscarSessao(id))!;
}

describe('FinalizarSessao: do treino em andamento ao resultado (US-015a, RF04)', () => {
  it('com série em todos os exercícios previstos fica concluída, com o fim do relógio e o resumo', async () => {
    const { sessoes, finalizar, serie, exercicios, sessaoId } = await preparar();
    for (const exercicio of exercicios) await sessoes.registrarSerie(exercicio, serie());
    await sessoes.registrarSerie(exercicios[0], serie());

    const resultado = await finalizar.executar({ sessaoId });

    if (!resultado.finalizada || resultado.situacao === 'descartada') throw new Error('resumo');
    expect(resultado.situacao).toBe('concluida');
    expect(resultado.resumo.duracaoEmSegundos).toBe(4530);
    expect(resultado.resumo.inicio.iso).toBe(QUARTA);
    expect(resultado.resumo.fim.iso).toBe(FIM);
    expect(resultado.resumo.totalDeSeries).toBe(7);
    expect(resultado.resumo.exercicios).toHaveLength(6);
    expect(resultado.resumo.exercicios[0]).toMatchObject({
      nome: 'Desenvolvimento com Barra',
      seriesFeitas: 2,
    });
    const gravada = await lida(sessoes, sessaoId);
    expect(gravada.situacao).toBe('concluida');
    expect(gravada.fim?.iso).toBe(FIM);
  });

  it('com exercício previsto sem série fica parcial e guarda as séries feitas (CE07)', async () => {
    const { sessoes, finalizar, serie, exercicios, sessaoId } = await preparar();
    await sessoes.registrarSerie(exercicios[0], serie());
    await sessoes.registrarSerie(exercicios[1], serie());

    const resultado = await finalizar.executar({ sessaoId });

    expect(resultado).toMatchObject({ finalizada: true, situacao: 'parcial' });
    const gravada = await lida(sessoes, sessaoId);
    expect(gravada.situacao).toBe('parcial');
    expect(gravada.exercicios.map((e) => e.series.length)).toEqual([1, 1, 0, 0, 0, 0]);
  });

  it('com série de trabalho sem RIR nada muda e o resultado diz quais séries pedem o RIR', async () => {
    const { sessoes, finalizar, serie, exercicios, sessaoId } = await preparar();
    for (const exercicio of exercicios) await sessoes.registrarSerie(exercicio, serie());
    const semRir = { ...serie(), rir: null };
    await sessoes.registrarSerie(exercicios[2], semRir);

    const resultado = await finalizar.executar({ sessaoId });

    expect(resultado).toMatchObject({ finalizada: false, motivo: 'rir_pendente' });
    if (resultado.finalizada || resultado.motivo !== 'rir_pendente') throw new Error('rir');
    expect(resultado.series.map((s) => s.serieId.valor)).toEqual([semRir.id.valor]);
    expect(resultado.series[0].exercicioDaSessaoId.valor).toBe(exercicios[2].valor);
    const gravada = await lida(sessoes, sessaoId);
    expect(gravada.situacao).toBe('em_andamento');
    expect(gravada.fim).toBeNull();
  });

  it('sem nenhuma série pergunta se deve descartar e nada muda (CE08)', async () => {
    const { sessoes, finalizar, sessaoId } = await preparar();

    const resultado = await finalizar.executar({ sessaoId });

    expect(resultado).toEqual({ finalizada: false, motivo: 'sem_series' });
    expect((await lida(sessoes, sessaoId)).situacao).toBe('em_andamento');
  });

  it('confirmado o descarte, a sessão fica descartada sem ser apagada e some do que está em andamento (CE08, FI-4)', async () => {
    const { sessoes, finalizar, sessaoId } = await preparar();

    const resultado = await finalizar.executar({ sessaoId, descartar: true });

    expect(resultado).toEqual({ finalizada: true, situacao: 'descartada' });
    const gravada = await lida(sessoes, sessaoId);
    expect(gravada.situacao).toBe('descartada');
    expect(gravada.fim?.iso).toBe(FIM);
    expect(gravada.exercicios).toHaveLength(6);
    expect(await sessoes.buscarSessaoEmAndamento()).toBeNull();
  });

  it('descartar uma sessão que tem séries é recusado e nada muda', async () => {
    const { sessoes, finalizar, serie, exercicios, sessaoId } = await preparar();
    await sessoes.registrarSerie(exercicios[0], serie());

    const tentativa = finalizar.executar({ sessaoId, descartar: true });

    await expect(tentativa).rejects.toBeInstanceOf(ErroDeValidacao);
    await expect(tentativa).rejects.toMatchObject({
      campo: 'descartar',
      esperado: 'sessão sem séries',
    });
    expect((await lida(sessoes, sessaoId)).situacao).toBe('em_andamento');
  });

  it('uma sessão que não está em andamento é recusada e nada muda', async () => {
    const { sessoes, finalizar, serie, exercicios, sessaoId } = await preparar();
    await sessoes.registrarSerie(exercicios[0], serie());
    await finalizar.executar({ sessaoId });
    const antes = await lida(sessoes, sessaoId);

    const outraVez = finalizar.executar({ sessaoId });

    await expect(outraVez).rejects.toMatchObject({
      campo: 'sessão',
      esperado: 'sessão em andamento',
    });
    expect(await lida(sessoes, sessaoId)).toEqual(antes);
  });

  it('o treino livre, sem exercício previsto, com série feita fica concluído', async () => {
    const { pronto, serie } = await preparar();
    const sessoes = new RepositorioDeSessoesEmMemoria();
    const fabrica = new FabricaDeSessoes(pronto.ids.get('Supino Reto')!);
    const livre = fabrica.sessao({ fichaId: null, versaoId: null, rotinaId: null });
    const exercicio = fabrica.exercicio();
    await sessoes.iniciarSessaoComExercicios(livre, [exercicio, fabrica.exercicio()]);
    await sessoes.registrarSerie(exercicio.id, serie());
    const finalizar = new FinalizarSessao(sessoes, pronto.catalogo, new RelogioFixo(FIM));

    const resultado = await finalizar.executar({ sessaoId: livre.id });

    expect(resultado).toMatchObject({ finalizada: true, situacao: 'concluida' });
  });
});
