import { CompararVersoes } from '../../src/aplicacao/casos-de-uso/comparar-versoes';
import { ErroDeValidacao } from '../../src/dominio/erro-de-validacao';
import { Identificador } from '../../src/dominio/identificador';
import { fichaEditadaTresVezes } from '../apoio/ficha-editada-tres-vezes';

async function iniciar() {
  const pronto = await fichaEditadaTresVezes();
  const caso = new CompararVersoes(pronto.fichas, pronto.catalogo);
  return { ...pronto, caso };
}

describe('CompararVersoes (US-010c, RF06)', () => {
  it('a linha alterada traz o nome do exercício, as séries no texto da planilha e os campos', async () => {
    const { caso, fichaId } = await iniciar();

    const comparacao = await caso.executar({ fichaId, numeroA: 1, numeroB: 4 });

    expect(comparacao).toMatchObject({ de: 1, para: 4 });
    expect(comparacao.rotinas).toHaveLength(1);
    const [linha] = comparacao.rotinas[0].linhas;
    expect(linha.tipo).toBe('alterada');
    expect(linha.campos).toEqual(['carga']);
    expect(linha.antes).toMatchObject({
      exercicioNome: 'Supino Reto',
      listas: { quantidade: 3, meta: '10', carga: null },
    });
    expect(linha.depois).toMatchObject({
      exercicioNome: 'Supino Reto',
      listas: { quantidade: 3, meta: '10', carga: '60' },
    });
  });

  it('a linha adicionada só tem o lado da versão maior, e a removida só o da menor', async () => {
    const { caso, fichaId } = await iniciar();

    const adicionada = await caso.executar({ fichaId, numeroA: 1, numeroB: 2 });
    const removida = await caso.executar({ fichaId, numeroA: 3, numeroB: 4 });

    const [igual, nova] = adicionada.rotinas[0].linhas;
    expect(igual.tipo).toBe('igual');
    expect([nova.tipo, nova.antes, nova.depois?.exercicioNome]).toEqual([
      'adicionada',
      null,
      'Remada Curvada',
    ]);
    const sumida = removida.rotinas[0].linhas[1];
    expect([sumida.tipo, sumida.antes?.exercicioNome, sumida.depois]).toEqual([
      'removida',
      'Remada Curvada',
      null,
    ]);
  });

  it('a menor versão fica à esquerda, qualquer que seja a ordem em que foram escolhidas', async () => {
    const { caso, fichaId } = await iniciar();

    const invertida = await caso.executar({ fichaId, numeroA: 4, numeroB: 1 });
    const normal = await caso.executar({ fichaId, numeroA: 1, numeroB: 4 });

    expect(invertida).toEqual(normal);
    expect(invertida).toMatchObject({ de: 1, para: 4 });
  });

  it('versões vizinhas sem mudança na linha mostram a linha como igual', async () => {
    const { caso, fichaId } = await iniciar();

    const comparacao = await caso.executar({ fichaId, numeroA: 2, numeroB: 3 });

    expect(comparacao.rotinas[0].linhas.map((l) => l.tipo)).toEqual(['alterada', 'igual']);
  });

  it('só lê: comparar não grava nenhuma versão', async () => {
    const { caso, fichas, fichaId } = await iniciar();
    const antes = await fichas.listarVersoes(fichaId);

    await caso.executar({ fichaId, numeroA: 1, numeroB: 3 });

    expect(await fichas.listarVersoes(fichaId)).toEqual(antes);
  });

  it('a mesma versão duas vezes, versão que não existe e ficha que não existe são recusadas', async () => {
    const { caso, fichaId } = await iniciar();
    const inexistente = Identificador.de('00000000-0000-7000-8000-00000000ffff');

    const igual = await caso.executar({ fichaId, numeroA: 2, numeroB: 2 }).then(
      () => undefined,
      (e: unknown) => e,
    );

    expect(igual).toBeInstanceOf(ErroDeValidacao);
    expect((igual as ErroDeValidacao).esperado).toMatch(/duas versões diferentes/);
    await expect(caso.executar({ fichaId, numeroA: 1, numeroB: 9 })).rejects.toBeInstanceOf(
      ErroDeValidacao,
    );
    await expect(
      caso.executar({ fichaId: inexistente, numeroA: 1, numeroB: 2 }),
    ).rejects.toBeInstanceOf(ErroDeValidacao);
  });
});
