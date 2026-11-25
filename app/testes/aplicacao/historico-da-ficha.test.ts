import { HistoricoDaFicha } from '../../src/aplicacao/casos-de-uso/historico-da-ficha';
import { ErroDeValidacao } from '../../src/dominio/erro-de-validacao';
import { Identificador } from '../../src/dominio/identificador';
import { fichaEditadaTresVezes } from '../apoio/ficha-editada-tres-vezes';
import { FabricaDeFichas } from '../apoio/ficha-de-exemplo';
import { RepositorioDeFichasEmMemoria } from '../dubles/repositorio-de-fichas-em-memoria';

describe('HistoricoDaFicha (US-010a, RF06)', () => {
  it('ficha criada e editada 3 vezes mostra 4 versões em ordem, com autor, data e motivo', async () => {
    const { fichas, fichaId } = await fichaEditadaTresVezes();

    const historico = await new HistoricoDaFicha(fichas).executar(fichaId);

    expect(historico.map((e) => e.numero)).toEqual([1, 2, 3, 4]);
    expect(historico.map((e) => e.autor)).toEqual(['usuario', 'usuario', 'usuario', 'usuario']);
    expect(historico.map((e) => e.motivo)).toEqual([
      null,
      'incluí remada',
      'subi a carga',
      'tirei a remada',
    ]);
    expect(historico[0].criadaEm.iso).toBe('2026-11-10T13:45:00.000Z');
  });

  it('cada versão traz o resumo da diferença em relação à anterior, e a primeira é a inicial', async () => {
    const { fichas, fichaId } = await fichaEditadaTresVezes();

    const historico = await new HistoricoDaFicha(fichas).executar(fichaId);

    expect(historico.map((e) => e.resumo)).toEqual([
      'Versão inicial',
      '1 linha adicionada',
      '1 linha alterada',
      '1 linha removida',
    ]);
  });

  it('a restauração é oferecida nas versões anteriores, e não na atual', async () => {
    const { fichas, fichaId } = await fichaEditadaTresVezes();

    const historico = await new HistoricoDaFicha(fichas).executar(fichaId);

    expect(historico.map((e) => e.podeRestaurar)).toEqual([true, true, true, false]);
  });

  it('a ficha com uma única versão não oferece restauração', async () => {
    const { fichas, fichaDaDt01 } = await fichaEditadaTresVezes();

    const historico = await new HistoricoDaFicha(fichas).executar(fichaDaDt01);

    expect(historico).toHaveLength(1);
    expect(historico[0]).toMatchObject({
      numero: 1,
      resumo: 'Versão inicial',
      podeRestaurar: false,
    });
  });

  it('o autor vem da versão: IA e importação aparecem como são', async () => {
    const fichas = new RepositorioDeFichasEmMemoria();
    const fabrica = new FabricaDeFichas(Identificador.de('00000000-0000-7000-8000-0000000d2001'));
    const ficha = fabrica.ficha();
    await fichas.criarFicha(ficha, {
      ...fabrica.versao({ series: 1, cargaEmQuilos: 40 }),
      autor: 'importacao',
    });
    await fichas.salvarNovaVersao(ficha.id, {
      ...fabrica.versao({ series: 2, cargaEmQuilos: 40 }),
      autor: 'ia',
    });

    const historico = await new HistoricoDaFicha(fichas).executar(ficha.id);

    expect(historico.map((e) => e.autor)).toEqual(['importacao', 'ia']);
    expect(historico[1].resumo).toBe('1 linha alterada');
  });

  it('só lê: abrir o histórico não muda nenhuma versão', async () => {
    const { fichas, fichaId } = await fichaEditadaTresVezes();
    const antes = await fichas.listarVersoes(fichaId);

    await new HistoricoDaFicha(fichas).executar(fichaId);

    expect(await fichas.listarVersoes(fichaId)).toEqual(antes);
  });

  it('ficha que não existe é recusada com ErroDeValidacao', async () => {
    const { fichas } = await fichaEditadaTresVezes();
    const inexistente = Identificador.de('00000000-0000-7000-8000-00000000ffff');

    await expect(new HistoricoDaFicha(fichas).executar(inexistente)).rejects.toBeInstanceOf(
      ErroDeValidacao,
    );
  });
});
