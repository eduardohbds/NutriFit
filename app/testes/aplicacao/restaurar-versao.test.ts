import { HistoricoDaFicha } from '../../src/aplicacao/casos-de-uso/historico-da-ficha';
import { RestaurarVersao } from '../../src/aplicacao/casos-de-uso/restaurar-versao';
import { ErroDeValidacao } from '../../src/dominio/erro-de-validacao';
import type { VersaoDaFicha } from '../../src/dominio/ficha';
import { Identificador } from '../../src/dominio/identificador';
import { fichaEditadaTresVezes } from '../apoio/ficha-editada-tres-vezes';
import { RelogioFixo } from '../dubles/relogio-fixo';

// O conteúdo da versão sem os identificadores, que mudam a cada gravação.
function conteudoDa(versao: VersaoDaFicha) {
  return versao.rotinas.map((r) => ({
    nome: r.nome,
    diaDaSemana: r.diaDaSemana,
    itens: r.itens.map((i) => ({
      exercicioId: i.exercicioId,
      grupoSequencia: i.grupoSequencia,
      unilateral: i.unilateral,
      travado: i.travado,
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

function identificadoresDe(versao: VersaoDaFicha) {
  const itens = versao.rotinas.flatMap((r) => r.itens);
  const ids = [versao.id, ...versao.rotinas.map((r) => r.id), ...itens.map((i) => i.id)];
  return [...ids, ...itens.flatMap((i) => i.series.map((s) => s.id))].map((id) => id.valor);
}

async function iniciar() {
  const pronto = await fichaEditadaTresVezes();
  const caso = new RestaurarVersao(pronto.fichas, pronto.gerador, new RelogioFixo());
  return { ...pronto, caso };
}

describe('RestaurarVersao (US-010a, FL04, RB02)', () => {
  it('restaurar a versão 2 cria a versão 5 idêntica à 2, e as versões 1 a 4 continuam idênticas', async () => {
    const { caso, fichas, fichaId } = await iniciar();
    const antes = await fichas.listarVersoes(fichaId);

    const { versao } = await caso.executar({ fichaId, numero: 2 });

    expect(versao.numero).toBe(5);
    expect(conteudoDa(versao)).toEqual(conteudoDa(antes[1]));
    const depois = await fichas.listarVersoes(fichaId);
    expect(depois.map((v) => v.numero)).toEqual([1, 2, 3, 4, 5]);
    expect(depois.slice(0, 4)).toEqual(antes);
  });

  it('a versão nova tem autor usuário, a data do relógio e o motivo automático', async () => {
    const { caso, fichaId } = await iniciar();

    const { versao } = await caso.executar({ fichaId, numero: 3 });

    expect(versao).toMatchObject({ autor: 'usuario', motivo: 'Restaurada a versão 3' });
    expect(versao.criadaEm.iso).toBe('2026-11-10T13:45:00.000Z');
  });

  it('a versão nova tem identificadores próprios, sem repartir nada com as anteriores', async () => {
    const { caso, fichas, fichaId } = await iniciar();
    const anteriores = (await fichas.listarVersoes(fichaId)).flatMap(identificadoresDe);

    const { versao } = await caso.executar({ fichaId, numero: 2 });

    const usados = new Set(anteriores);
    expect(identificadoresDe(versao).filter((id) => usados.has(id))).toEqual([]);
  });

  it('o histórico mostra a restauração como a versão 5, com o resumo em relação à 4', async () => {
    const { caso, fichas, fichaId } = await iniciar();

    await caso.executar({ fichaId, numero: 2 });
    const historico = await new HistoricoDaFicha(fichas).executar(fichaId);

    expect(historico).toHaveLength(5);
    expect(historico[4]).toMatchObject({
      numero: 5,
      motivo: 'Restaurada a versão 2',
      resumo: '1 linha alterada, 1 linha adicionada',
      podeRestaurar: false,
    });
    expect(historico[3].podeRestaurar).toBe(true);
  });

  it('o nome da ficha não muda ao restaurar, e as outras fichas não são tocadas', async () => {
    const { caso, fichas, fichaId, fichaDaDt01 } = await iniciar();
    const fichasAntes = await fichas.listarFichas();
    const dt01Antes = await fichas.listarVersoes(fichaDaDt01);

    await caso.executar({ fichaId, numero: 1 });

    expect(await fichas.listarFichas()).toEqual(fichasAntes);
    expect(await fichas.listarVersoes(fichaDaDt01)).toEqual(dt01Antes);
  });

  it('restaurar a versão atual é recusado, dizendo o valor recebido, sem gravar nada', async () => {
    const { caso, fichas, fichaId } = await iniciar();

    const erro = await caso.executar({ fichaId, numero: 4 }).then(
      () => undefined,
      (e: unknown) => e,
    );

    expect(erro).toBeInstanceOf(ErroDeValidacao);
    expect((erro as ErroDeValidacao).campo).toBe('versão');
    expect((erro as ErroDeValidacao).recebido).toBe(4);
    expect((erro as ErroDeValidacao).esperado).toMatch(/anterior à atual/);
    expect(await fichas.listarVersoes(fichaId)).toHaveLength(4);
  });

  it('a ficha com uma única versão não pode ser restaurada', async () => {
    const { caso, fichas, fichaDaDt01 } = await iniciar();

    await expect(caso.executar({ fichaId: fichaDaDt01, numero: 1 })).rejects.toBeInstanceOf(
      ErroDeValidacao,
    );
    expect(await fichas.listarVersoes(fichaDaDt01)).toHaveLength(1);
  });

  it('versão que não existe e ficha que não existe são recusadas com ErroDeValidacao', async () => {
    const { caso, fichaId } = await iniciar();
    const inexistente = Identificador.de('00000000-0000-7000-8000-00000000ffff');

    await expect(caso.executar({ fichaId, numero: 9 })).rejects.toBeInstanceOf(ErroDeValidacao);
    await expect(caso.executar({ fichaId, numero: 0 })).rejects.toBeInstanceOf(ErroDeValidacao);
    await expect(caso.executar({ fichaId: inexistente, numero: 1 })).rejects.toBeInstanceOf(
      ErroDeValidacao,
    );
  });
});
