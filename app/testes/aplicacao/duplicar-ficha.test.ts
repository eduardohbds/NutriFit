import { DuplicarFicha } from '../../src/aplicacao/casos-de-uso/duplicar-ficha';
import { ErroDeValidacao } from '../../src/dominio/erro-de-validacao';
import type { VersaoDaFicha } from '../../src/dominio/ficha';
import { Identificador } from '../../src/dominio/identificador';
import { fichasParaTela } from '../apoio/fichas-de-tela';
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

function identificadoresDa(versao: VersaoDaFicha): string[] {
  const rotinas = versao.rotinas;
  const itens = rotinas.flatMap((r) => r.itens);
  const series = itens.flatMap((i) => i.series);
  return [
    versao.id,
    ...rotinas.map((r) => r.id),
    ...itens.map((i) => i.id),
    ...series.map((s) => s.id),
  ].map((id) => id.valor);
}

async function iniciar() {
  const pronto = await fichasParaTela();
  const caso = new DuplicarFicha(pronto.fichas, pronto.gerador, new RelogioFixo());
  return { ...pronto, caso };
}

describe('DuplicarFicha (US-009a)', () => {
  it('cria uma ficha nova, inativa, de origem duplicada, com o nome e a cópia entre parênteses', async () => {
    const { caso, fichas, fichaDaDt01 } = await iniciar();

    const { fichaId } = await caso.executar(fichaDaDt01);

    const copia = (await fichas.listarFichas()).find((f) => f.id.valor === fichaId.valor);
    expect(fichaId.valor).not.toBe(fichaDaDt01.valor);
    expect(copia).toMatchObject({
      nome: 'Ficha de referência (DT01) (cópia)',
      situacao: 'inativa',
      origem: 'duplicada',
    });
    expect(copia?.criadaEm.iso).toBe('2026-11-10T13:45:00.000Z');
  });

  it('a cópia grava a versão 1 com o conteúdo idêntico ao da versão atual da original', async () => {
    const { caso, fichas, fichaDaDt01 } = await iniciar();
    const original = (await fichas.buscarVersaoAtual(fichaDaDt01))!;

    const { versao } = await caso.executar(fichaDaDt01);

    expect(versao).toMatchObject({ numero: 1, autor: 'usuario' });
    expect(conteudoDa(versao)).toEqual(conteudoDa(original));
    expect(versao.rotinas.flatMap((r) => r.itens)).toHaveLength(30);
  });

  it('com a original em várias versões, a cópia leva só a atual como versão 1', async () => {
    const { caso, fichas, fichaCompleta } = await iniciar();
    const atual = (await fichas.buscarVersaoAtual(fichaCompleta))!;

    const { fichaId, versao } = await caso.executar(fichaCompleta);

    expect(atual.numero).toBe(2);
    expect((await fichas.listarVersoes(fichaId)).map((v) => v.numero)).toEqual([1]);
    expect(conteudoDa(versao)).toEqual(conteudoDa(atual));
  });

  it('a cópia tem identificadores próprios, sem repartir nada com a original', async () => {
    const { caso, fichas, fichaDaDt01 } = await iniciar();
    const original = (await fichas.buscarVersaoAtual(fichaDaDt01))!;

    const { versao } = await caso.executar(fichaDaDt01);

    const daOriginal = new Set(identificadoresDa(original));
    const daCopia = identificadoresDa(versao);
    expect(daCopia.length).toBeGreaterThan(30);
    expect(daCopia.filter((id) => daOriginal.has(id))).toEqual([]);
  });

  it('o histórico da cópia é próprio: salvar nela não muda a original', async () => {
    const { caso, fichas, salvarFicha, fichaCompleta } = await iniciar();
    const versoesAntes = await fichas.listarVersoes(fichaCompleta);
    const { fichaId, versao } = await caso.executar(fichaCompleta);
    const pedido = {
      fichaId,
      nome: 'Treino completo (cópia)',
      rotinas: versao.rotinas.map((r) => ({
        nome: r.nome,
        diaDaSemana: r.diaDaSemana,
        itens: r.itens.map((i, posicao) => ({
          ordem: posicao + 1,
          exercicioId: i.exercicioId,
          grupo: i.grupoSequencia,
          unilateral: i.unilateral,
          observacoes: i.observacoes,
          series: [{ meta: '8', cargaEmQuilos: null, tecnica: null, descansoSegundos: null }],
        })),
      })),
    };

    await salvarFicha.executar(pedido);

    expect((await fichas.listarVersoes(fichaId)).map((v) => v.numero)).toEqual([1, 2]);
    expect(await fichas.listarVersoes(fichaCompleta)).toEqual(versoesAntes);
  });

  it('duplicar não altera a original, nem a situação dela', async () => {
    const { caso, fichas, fichaDaDt01 } = await iniciar();
    const fichasAntes = await fichas.listarFichas();
    const versoesAntes = await fichas.listarVersoes(fichaDaDt01);

    await caso.executar(fichaDaDt01);

    const fichasDepois = await fichas.listarFichas();
    expect(fichasDepois.slice(0, fichasAntes.length)).toEqual(fichasAntes);
    expect(await fichas.listarVersoes(fichaDaDt01)).toEqual(versoesAntes);
  });

  it('a ficha arquivada também pode ser duplicada, e a cópia nasce inativa', async () => {
    const { caso, fichas, fichaDaDt01 } = await iniciar();
    await fichas.arquivarFicha(fichaDaDt01);

    const { fichaId } = await caso.executar(fichaDaDt01);

    const copia = (await fichas.listarFichas()).find((f) => f.id.valor === fichaId.valor);
    expect(copia?.situacao).toBe('inativa');
  });

  it('recusa a ficha que não existe com ErroDeValidacao', async () => {
    const { caso } = await iniciar();
    const inexistente = Identificador.de('00000000-0000-7000-8000-00000000ffff');

    await expect(caso.executar(inexistente)).rejects.toBeInstanceOf(ErroDeValidacao);
  });
});
