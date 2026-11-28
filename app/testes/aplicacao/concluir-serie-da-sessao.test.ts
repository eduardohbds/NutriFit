import { drizzle } from 'drizzle-orm/better-sqlite3';

import { RepositorioDeSessoesSqlite } from '../../src/adaptadores/sqlite/repositorio-de-sessoes-sqlite';
import { ConcluirSerieDaSessao } from '../../src/aplicacao/casos-de-uso/concluir-serie-da-sessao';
import { RegistrarFalha } from '../../src/aplicacao/casos-de-uso/registrar-falha';
import { RegistrarSerie } from '../../src/aplicacao/casos-de-uso/registrar-serie';
import { ErroDeValidacao } from '../../src/dominio/erro-de-validacao';
import { Identificador } from '../../src/dominio/identificador';
import type { RepositorioDeSessoes } from '../../src/aplicacao/portas/repositorio-de-sessoes';
import { abrirBancoMigrado, inserir } from '../apoio/banco-sqlite';
import { FabricaDeSessoes } from '../apoio/sessao-de-exemplo';
import { GeradorDeIdentificadorSequencial } from '../dubles/gerador-de-identificador-sequencial';
import { RegistroDeFalhasEmMemoria } from '../dubles/registro-de-falhas-em-memoria';
import { RelogioFixo } from '../dubles/relogio-fixo';
import { RepositorioDeSessoesSemEspaco } from '../dubles/repositorio-de-sessoes-sem-espaco';

const AGORA = '2026-11-11T12:30:00.000Z';

function montarCaso(sessoes: RepositorioDeSessoes) {
  const registro = new RegistroDeFalhasEmMemoria();
  const registrarSerie = new RegistrarSerie(
    sessoes,
    new RegistrarFalha(registro, new RelogioFixo(AGORA), '0.0.1'),
  );
  return new ConcluirSerieDaSessao(
    registrarSerie,
    new RelogioFixo(AGORA),
    new GeradorDeIdentificadorSequencial(),
  );
}

async function sessaoComUmExercicio(sessoes: RepositorioDeSessoes, exercicioId: Identificador) {
  const fabrica = new FabricaDeSessoes(exercicioId);
  const sessao = fabrica.sessao({ fichaId: null, versaoId: null, rotinaId: null });
  const exercicio = fabrica.exercicio();
  await sessoes.iniciarSessaoComExercicios(sessao, [exercicio]);
  return { sessao, exercicioDaSessaoId: exercicio.id };
}

const EXERCICIO = Identificador.de('00000000-0000-7000-8000-00000000e001');

async function seriesGravadas(sessoes: RepositorioDeSessoes, id: Identificador) {
  return (await sessoes.buscarSessao(id))!.exercicios[0].series;
}

describe('ConcluirSerieDaSessao: do texto digitado à série gravada (US-013d2, RF02, FI-1)', () => {
  it('grava a série de trabalho com a carga, as repetições, o RIR e o instante real do relógio', async () => {
    const sessoes = new RepositorioDeSessoesSemEspaco();
    const { sessao, exercicioDaSessaoId } = await sessaoComUmExercicio(sessoes, EXERCICIO);
    const caso = montarCaso(sessoes);

    const resultado = await caso.executar({
      exercicioDaSessaoId,
      entrada: { tipo: 'trabalho', carga: '60,5', repeticoes: '10', rir: '2' },
    });

    expect(resultado).toEqual({ gravada: true });
    const [serie] = await seriesGravadas(sessoes, sessao.id);
    expect(serie).toMatchObject({
      tipo: 'trabalho',
      repeticoes: 10,
      rir: 2,
      segundos: null,
      removidaEm: null,
    });
    expect(serie.carga?.gramas).toBe(60500);
    expect(serie.concluidaEm.iso).toBe(AGORA);
  });

  it('série unilateral guarda os dois lados e conta uma vez (RB19)', async () => {
    const sessoes = new RepositorioDeSessoesSemEspaco();
    const { sessao, exercicioDaSessaoId } = await sessaoComUmExercicio(sessoes, EXERCICIO);

    await montarCaso(sessoes).executar({
      exercicioDaSessaoId,
      entrada: {
        tipo: 'trabalho',
        carga: '12',
        repeticoes: '10',
        repeticoesOutroLado: '8',
        rir: '1',
      },
    });

    const series = await seriesGravadas(sessoes, sessao.id);
    expect(series).toHaveLength(1);
    expect(series[0]).toMatchObject({ repeticoes: 10, repeticoesOutroLado: 8 });
  });

  it('série de trabalho sem RIR é recusada no campo rir e nada é gravado (RB09)', async () => {
    const sessoes = new RepositorioDeSessoesSemEspaco();
    const { sessao, exercicioDaSessaoId } = await sessaoComUmExercicio(sessoes, EXERCICIO);

    const tentativa = montarCaso(sessoes).executar({
      exercicioDaSessaoId,
      entrada: { tipo: 'trabalho', carga: '60', repeticoes: '10', rir: '' },
    });

    await expect(tentativa).rejects.toMatchObject({ campo: 'rir', esperado: 'inteiro de 0 a 5' });
    expect(await seriesGravadas(sessoes, sessao.id)).toEqual([]);
  });

  it('valor inválido é recusado com o campo, o valor recebido e o formato esperado', async () => {
    const sessoes = new RepositorioDeSessoesSemEspaco();
    const { sessao, exercicioDaSessaoId } = await sessaoComUmExercicio(sessoes, EXERCICIO);

    const tentativa = montarCaso(sessoes).executar({
      exercicioDaSessaoId,
      entrada: { tipo: 'trabalho', carga: '60', repeticoes: 'abc', rir: '2' },
    });

    await expect(tentativa).rejects.toBeInstanceOf(ErroDeValidacao);
    await expect(tentativa).rejects.toMatchObject({
      campo: 'repetições',
      recebido: 'abc',
      esperado: 'inteiro maior ou igual a 1',
    });
    expect(await seriesGravadas(sessoes, sessao.id)).toEqual([]);
  });

  it('sem espaço no aparelho nada é gravado, e a mesma entrada enviada de novo é gravada (CE61)', async () => {
    const sessoes = new RepositorioDeSessoesSemEspaco();
    const { sessao, exercicioDaSessaoId } = await sessaoComUmExercicio(sessoes, EXERCICIO);
    const caso = montarCaso(sessoes);
    const pedido = {
      exercicioDaSessaoId,
      entrada: { tipo: 'trabalho' as const, carga: '60', repeticoes: '10', rir: '2' },
    };
    sessoes.cheio = true;

    expect(await caso.executar(pedido)).toEqual({ gravada: false, motivo: 'sem_espaco' });
    expect(await seriesGravadas(sessoes, sessao.id)).toEqual([]);

    sessoes.cheio = false;
    expect(await caso.executar(pedido)).toEqual({ gravada: true });
    expect(await seriesGravadas(sessoes, sessao.id)).toHaveLength(1);
  });

  it('no banco real, sem rede nenhuma, a série fica salva em até 1 segundo (TE01, RNF01)', async () => {
    const banco = abrirBancoMigrado();
    const exercicio = inserir(banco, 'exercicio', {
      nome: 'Supino Reto',
      situacao: 'ativo',
      origem: 'inicial',
    });
    const sessoes = new RepositorioDeSessoesSqlite(drizzle(banco));
    const { sessao, exercicioDaSessaoId } = await sessaoComUmExercicio(
      sessoes,
      Identificador.de(exercicio),
    );
    const caso = montarCaso(sessoes);

    const antes = Date.now();
    const resultado = await caso.executar({
      exercicioDaSessaoId,
      entrada: { tipo: 'trabalho', carga: '60', repeticoes: '10', rir: '2' },
    });
    const duracao = Date.now() - antes;

    expect(resultado).toEqual({ gravada: true });
    expect(duracao).toBeLessThanOrEqual(1000);
    expect(await seriesGravadas(sessoes, sessao.id)).toHaveLength(1);
  });
});
