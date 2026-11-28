import { IniciarSessao } from '../../src/aplicacao/casos-de-uso/iniciar-sessao';
import { LerSessaoEmAndamento } from '../../src/aplicacao/casos-de-uso/ler-sessao-em-andamento';
import { InstanteUtc } from '../../src/dominio/instante-utc';
import { fichasParaTela } from '../apoio/fichas-de-tela';
import { QUARTA } from '../apoio/inicio-de-tela';
import { FabricaDeSessoes } from '../apoio/sessao-de-exemplo';
import { RelogioFixo } from '../dubles/relogio-fixo';
import { RepositorioDeSessoesEmMemoria } from '../dubles/repositorio-de-sessoes-em-memoria';

async function iniciada() {
  const pronto = await fichasParaTela();
  await pronto.ativarFicha.executar(pronto.fichaDaDt01);
  const sessoes = new RepositorioDeSessoesEmMemoria();
  const versao = (await pronto.fichas.buscarVersaoAtual(pronto.fichaDaDt01))!;
  const rotina = versao.rotinas.find((r) => r.nome === 'Quarta')!;
  const iniciar = new IniciarSessao(
    pronto.fichas,
    sessoes,
    new RelogioFixo(QUARTA),
    pronto.gerador,
  );
  const resultado = await iniciar.executar(rotina.id);
  if (!resultado.iniciada) throw new Error('esperava sessão iniciada');
  const ler = new LerSessaoEmAndamento(sessoes, pronto.fichas, pronto.catalogo);
  const fabrica = new FabricaDeSessoes(pronto.ids.get('Supino Reto')!);
  return { sessoes, ler, rotina, resultado, fabrica };
}

describe('LerSessaoEmAndamento: planejado das séries e séries registradas (US-013d2, RF02)', () => {
  it('traz as séries planejadas e o unilateral do item de origem, da versão da época', async () => {
    const { ler, rotina } = await iniciada();

    const sessao = await ler.executar();

    expect(sessao?.exercicios.map((e) => e.planejadas)).toEqual(rotina.itens.map((i) => i.series));
    expect(sessao?.exercicios.map((e) => e.unilateral)).toEqual(
      rotina.itens.map((i) => i.unilateral),
    );
  });

  it('traz as séries registradas de cada exercício na ordem, sem as removidas', async () => {
    const { sessoes, ler, resultado, fabrica } = await iniciada();
    const [primeiro, segundo] = resultado.exerciciosDaSessao;
    const a = fabrica.serie({ cargaEmQuilos: 40, repeticoes: 10, rir: 3 });
    const b = fabrica.serie({ cargaEmQuilos: 42.5, repeticoes: 8, rir: 1 });
    const c = fabrica.serie({ cargaEmQuilos: 30, repeticoes: 12, rir: 2 });
    await sessoes.registrarSerie(primeiro, a);
    await sessoes.registrarSerie(primeiro, b);
    await sessoes.registrarSerie(segundo, c);
    const corrigida = fabrica.serie({ cargaEmQuilos: 40, repeticoes: 11, rir: 3 });
    await sessoes.corrigirSerie(a.id, corrigida, InstanteUtc.de(QUARTA));

    const sessao = await ler.executar();

    expect(sessao?.exercicios[0].series.map((s) => s.repeticoes)).toEqual([11, 8]);
    expect(sessao?.exercicios[0].series.every((s) => s.removidaEm === null)).toBe(true);
    expect(sessao?.exercicios[1].series.map((s) => s.repeticoes)).toEqual([12]);
    expect(sessao?.exercicios[2].series).toEqual([]);
  });
});
