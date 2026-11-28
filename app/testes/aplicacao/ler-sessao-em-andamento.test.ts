import { IniciarSessao } from '../../src/aplicacao/casos-de-uso/iniciar-sessao';
import { LerSessaoEmAndamento } from '../../src/aplicacao/casos-de-uso/ler-sessao-em-andamento';
import { InstanteUtc } from '../../src/dominio/instante-utc';
import { fichasParaTela, NOME_DA_FICHA_DT01, pedidoDaDt01 } from '../apoio/fichas-de-tela';
import { QUARTA } from '../apoio/inicio-de-tela';
import { RelogioFixo } from '../dubles/relogio-fixo';
import { RepositorioDeSessoesEmMemoria } from '../dubles/repositorio-de-sessoes-em-memoria';

async function preparar() {
  const pronto = await fichasParaTela();
  await pronto.ativarFicha.executar(pronto.fichaDaDt01);
  const sessoes = new RepositorioDeSessoesEmMemoria();
  const relogio = new RelogioFixo(QUARTA);
  const iniciar = new IniciarSessao(pronto.fichas, sessoes, relogio, pronto.gerador);
  const ler = new LerSessaoEmAndamento(sessoes, pronto.fichas, pronto.catalogo);
  const versao = (await pronto.fichas.buscarVersaoAtual(pronto.fichaDaDt01))!;
  const rotina = (dia: string) => versao.rotinas.find((r) => r.nome === dia)!;
  return { ...pronto, sessoes, iniciar, ler, versao, rotina };
}

describe('LerSessaoEmAndamento (RF01, RB04)', () => {
  it('sem sessão em andamento devolve nulo', async () => {
    const { ler } = await preparar();

    expect(await ler.executar()).toBeNull();
  });

  it('devolve a ficha, a rotina, a versão e os exercícios na ordem, com nome e planejado', async () => {
    const { ler, iniciar, rotina } = await preparar();
    const resultado = await iniciar.executar(rotina('Quarta').id);
    if (!resultado.iniciada) throw new Error('esperava sessão iniciada');

    const sessao = await ler.executar();

    expect(sessao).toMatchObject({
      fichaNome: NOME_DA_FICHA_DT01,
      rotinaNome: 'Quarta',
      versaoNumero: 1,
    });
    expect(sessao?.sessaoId.valor).toBe(resultado.sessaoId.valor);
    expect(sessao?.inicio.iso).toBe(InstanteUtc.de(QUARTA).iso);
    expect(sessao?.exercicios).toHaveLength(6);
    expect(sessao?.exercicios.map((e) => e.ordem)).toEqual([1, 2, 3, 4, 5, 6]);
    expect(sessao?.exercicios[0]).toMatchObject({
      nome: 'Desenvolvimento com Barra',
      listas: { quantidade: 4, meta: '10' },
    });
    expect(sessao?.exercicios[5].nome).toBe('Rosca de Punho Inversa');
    expect(sessao?.exercicios.map((e) => e.id.valor)).toEqual(
      resultado.exerciciosDaSessao.map((id) => id.valor),
    );
  });

  it('o planejado e a versão são os da época, mesmo se a ficha foi editada depois (CE05)', async () => {
    const { ler, iniciar, rotina, salvarFicha, ids, fichaDaDt01 } = await preparar();
    await iniciar.executar(rotina('Quarta').id);
    const pedido = pedidoDaDt01(ids);
    const primeiro = pedido.rotinas[2].itens[0];
    pedido.rotinas[2].itens[0] = { ...primeiro, listas: { ...primeiro.listas!, meta: '15' } };
    await salvarFicha.executar({ ...pedido, fichaId: fichaDaDt01, motivo: 'ajuste' });

    const sessao = await ler.executar();

    expect(sessao?.versaoNumero).toBe(1);
    expect(sessao?.rotinaNome).toBe('Quarta');
    expect(sessao?.exercicios[0].listas?.meta).toBe('10');
  });

  it('treino livre, sem ficha, não traz ficha, rotina, versão nem planejado', async () => {
    const { ler, sessoes, gerador, ids } = await preparar();
    await sessoes.iniciarSessaoComExercicios(
      {
        id: gerador.gerar(),
        inicio: InstanteUtc.de(QUARTA),
        fim: null,
        fichaId: null,
        versaoId: null,
        rotinaId: null,
        situacao: 'em_andamento',
        observacao: null,
      },
      [
        {
          id: gerador.gerar(),
          exercicioId: ids.get('Supino Reto')!,
          itemOrigemId: null,
          observacoes: null,
        },
      ],
    );

    const sessao = await ler.executar();

    expect(sessao).toMatchObject({ fichaNome: null, rotinaNome: null, versaoNumero: null });
    expect(sessao?.exercicios).toHaveLength(1);
    expect(sessao?.exercicios[0]).toMatchObject({ nome: 'Supino Reto', listas: null, ordem: 1 });
  });

  it('só lê: a sessão e a ficha ficam como estavam', async () => {
    const { ler, iniciar, rotina, sessoes, fichas, fichaDaDt01 } = await preparar();
    const resultado = await iniciar.executar(rotina('Quarta').id);
    if (!resultado.iniciada) throw new Error('esperava sessão iniciada');
    const sessaoAntes = await sessoes.buscarSessao(resultado.sessaoId);
    const versoesAntes = await fichas.listarVersoes(fichaDaDt01);

    await ler.executar();
    await ler.executar();

    expect(await sessoes.buscarSessao(resultado.sessaoId)).toEqual(sessaoAntes);
    expect(await fichas.listarVersoes(fichaDaDt01)).toEqual(versoesAntes);
  });
});
