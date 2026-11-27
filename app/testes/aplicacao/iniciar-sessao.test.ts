import { IniciarSessao } from '../../src/aplicacao/casos-de-uso/iniciar-sessao';
import { ErroDeValidacao } from '../../src/dominio/erro-de-validacao';
import type { Identificador } from '../../src/dominio/identificador';
import { InstanteUtc } from '../../src/dominio/instante-utc';
import { pedidoDaDt01, fichasParaTela } from '../apoio/fichas-de-tela';
import { RelogioFixo } from '../dubles/relogio-fixo';
import { RepositorioDeSessoesEmMemoria } from '../dubles/repositorio-de-sessoes-em-memoria';

const QUARTA_A_NOITE = '2026-11-11T23:59:30.000Z';

// Só o método atômico existe: se o caso de uso gravar a sessão e os exercícios em chamadas
// separadas, uma falha no meio deixaria uma sessão pela metade.
class SoAtomico extends RepositorioDeSessoesEmMemoria {
  override async iniciarSessao(): Promise<void> {
    throw new Error('gravação em duas etapas: use iniciarSessaoComExercicios');
  }

  override async adicionarExercicio(): Promise<void> {
    throw new Error('gravação em duas etapas: use iniciarSessaoComExercicios');
  }
}

async function iniciar(sessoes = new RepositorioDeSessoesEmMemoria(), ativar = true) {
  const pronto = await fichasParaTela();
  if (ativar) await pronto.ativarFicha.executar(pronto.fichaDaDt01);
  const versao = (await pronto.fichas.buscarVersaoAtual(pronto.fichaDaDt01))!;
  const rotina = (dia: string) => versao.rotinas.find((r) => r.nome === dia)!;
  const caso = new IniciarSessao(
    pronto.fichas,
    sessoes,
    new RelogioFixo(QUARTA_A_NOITE),
    pronto.gerador,
  );
  return { ...pronto, sessoes, versao, rotina, caso };
}

function erroDe(falha: unknown): ErroDeValidacao {
  expect(falha).toBeInstanceOf(ErroDeValidacao);
  return falha as ErroDeValidacao;
}

describe('IniciarSessao: a sessão nasce presa à versão usada na época (RF01, RB04)', () => {
  it('cria a sessão em andamento com ficha, versão e rotina, e um exercício por item, na ordem', async () => {
    const { caso, sessoes, versao, rotina, fichaDaDt01 } = await iniciar();
    const quarta = rotina('Quarta');

    const resultado = await caso.executar(quarta.id);

    expect(resultado.iniciada).toBe(true);
    if (!resultado.iniciada) return;
    const sessao = await sessoes.buscarSessao(resultado.sessaoId);
    expect(sessao).toMatchObject({ situacao: 'em_andamento', fim: null, observacao: null });
    expect(sessao?.fichaId?.valor).toBe(fichaDaDt01.valor);
    expect(sessao?.versaoId?.valor).toBe(versao.id.valor);
    expect(sessao?.rotinaId?.valor).toBe(quarta.id.valor);
    expect(sessao?.exercicios).toHaveLength(6);
    expect(sessao?.exercicios.map((e) => e.exercicioId.valor)).toEqual(
      quarta.itens.map((i) => i.exercicioId.valor),
    );
  });

  it('cada exercício da sessão guarda o item de origem da versão e nenhuma série', async () => {
    const { caso, sessoes, rotina } = await iniciar();
    const quarta = rotina('Quarta');

    const resultado = await caso.executar(quarta.id);

    if (!resultado.iniciada) throw new Error('esperava sessão iniciada');
    const sessao = await sessoes.buscarSessao(resultado.sessaoId);
    expect(sessao?.exercicios.map((e) => e.itemOrigemId?.valor)).toEqual(
      quarta.itens.map((i) => i.id.valor),
    );
    expect(sessao?.exercicios.every((e) => e.series.length === 0 && e.observacoes === null)).toBe(
      true,
    );
  });

  it('o resultado traz o identificador da sessão e dos exercícios da sessão, na ordem', async () => {
    const { caso, sessoes, rotina } = await iniciar();

    const resultado = await caso.executar(rotina('Quarta').id);

    if (!resultado.iniciada) throw new Error('esperava sessão iniciada');
    const sessao = await sessoes.buscarSessao(resultado.sessaoId);
    expect(resultado.exerciciosDaSessao.map((id) => id.valor)).toEqual(
      sessao?.exercicios.map((e) => e.id.valor),
    );
  });

  it('escolher outra rotina que não a de hoje cria a sessão dela', async () => {
    const { caso, sessoes, rotina, ids } = await iniciar();
    const sexta = rotina('Sexta');

    const resultado = await caso.executar(sexta.id);

    if (!resultado.iniciada) throw new Error('esperava sessão iniciada');
    const sessao = await sessoes.buscarSessao(resultado.sessaoId);
    expect(sessao?.rotinaId?.valor).toBe(sexta.id.valor);
    expect(sessao?.exercicios[0].exercicioId.valor).toBe(ids.get('Esteira')?.valor);
  });

  it('o início é o instante real do relógio, e a sessão fica no dia em que começou (CE06)', async () => {
    const { caso, sessoes, rotina } = await iniciar();

    const resultado = await caso.executar(rotina('Quarta').id);

    if (!resultado.iniciada) throw new Error('esperava sessão iniciada');
    const sessao = await sessoes.buscarSessao(resultado.sessaoId);
    expect(sessao?.inicio.iso).toBe(InstanteUtc.de(QUARTA_A_NOITE).iso);
  });

  it('grava só pelo método atômico da porta', async () => {
    const { caso, sessoes, rotina } = await iniciar(new SoAtomico());

    const resultado = await caso.executar(rotina('Quarta').id);

    expect(resultado.iniciada).toBe(true);
    expect((await sessoes.buscarSessaoEmAndamento())?.exercicios).toHaveLength(6);
  });

  it('se a gravação falha, o erro sobe e nenhuma sessão fica em andamento', async () => {
    const sessoes = new RepositorioDeSessoesEmMemoria();
    jest
      .spyOn(sessoes, 'iniciarSessaoComExercicios')
      .mockRejectedValueOnce(new Error('disco com defeito'));
    const { caso, rotina } = await iniciar(sessoes);

    await expect(caso.executar(rotina('Quarta').id)).rejects.toThrow('disco com defeito');

    expect(await sessoes.buscarSessaoEmAndamento()).toBeNull();
  });
});

describe('IniciarSessao: a ficha não muda (RB02, RB03, FI-4)', () => {
  it('nenhuma versão nasce e as fichas ficam como estavam', async () => {
    const { caso, fichas, rotina, fichaDaDt01 } = await iniciar();
    const versoesAntes = await fichas.listarVersoes(fichaDaDt01);
    const fichasAntes = await fichas.listarFichas();

    await caso.executar(rotina('Quarta').id);

    expect(await fichas.listarVersoes(fichaDaDt01)).toEqual(versoesAntes);
    expect(await fichas.listarFichas()).toEqual(fichasAntes);
  });

  it('a ficha editada depois continua com a versão com que a sessão começou (CE05)', async () => {
    const { caso, sessoes, salvarFicha, ids, fichas, fichaDaDt01, versao, rotina } =
      await iniciar();
    const quarta = rotina('Quarta');
    const resultado = await caso.executar(quarta.id);
    if (!resultado.iniciada) throw new Error('esperava sessão iniciada');

    await salvarFicha.executar({ ...pedidoDaDt01(ids), fichaId: fichaDaDt01, motivo: 'ajuste' });

    const sessao = await sessoes.buscarSessao(resultado.sessaoId);
    expect((await fichas.buscarVersaoAtual(fichaDaDt01))?.numero).toBe(versao.numero + 1);
    expect(sessao?.versaoId?.valor).toBe(versao.id.valor);
    expect(sessao?.rotinaId?.valor).toBe(quarta.id.valor);
  });
});

describe('IniciarSessao: só uma sessão em andamento (CE03)', () => {
  it('com uma já em andamento, devolve o identificador dela e não cria nada', async () => {
    const { caso, sessoes, rotina } = await iniciar();
    const primeira = await caso.executar(rotina('Quarta').id);
    if (!primeira.iniciada) throw new Error('esperava sessão iniciada');

    const segunda = await caso.executar(rotina('Sexta').id);

    expect(segunda).toEqual({
      iniciada: false,
      motivo: 'ja_em_andamento',
      sessaoId: primeira.sessaoId,
    });
    const emAndamento = await sessoes.buscarSessaoEmAndamento();
    expect(emAndamento?.id.valor).toBe(primeira.sessaoId.valor);
    expect(emAndamento?.exercicios).toHaveLength(6);
    expect(emAndamento?.rotinaId?.valor).toBe(rotina('Quarta').id.valor);
  });

  it('uma sessão concluída não impede de iniciar outra', async () => {
    const { caso, sessoes, rotina, fichaDaDt01, versao, gerador } = await iniciar();
    const concluida = {
      id: gerador.gerar(),
      inicio: InstanteUtc.de('2026-11-10T09:00:00.000Z'),
      fim: InstanteUtc.de('2026-11-10T10:00:00.000Z'),
      fichaId: fichaDaDt01,
      versaoId: versao.id,
      rotinaId: rotina('Terça').id,
      situacao: 'concluida' as const,
      observacao: null,
    };
    await sessoes.iniciarSessao(concluida);

    const resultado = await caso.executar(rotina('Quarta').id);

    expect(resultado.iniciada).toBe(true);
  });
});

describe('IniciarSessao: só a rotina da versão atual da ficha ativa (VE)', () => {
  it('sem ficha ativa é recusado, e nada é gravado', async () => {
    const { caso, sessoes, rotina } = await iniciar(undefined, false);

    const falha = await caso.executar(rotina('Quarta').id).catch((erro: unknown) => erro);

    expect(erroDe(falha)).toMatchObject({ campo: 'ficha ativa' });
    expect(erroDe(falha).esperado).toBe('ficha ativa para iniciar o treino');
    expect(await sessoes.buscarSessaoEmAndamento()).toBeNull();
  });

  it('com a ficha arquivada é recusado do mesmo jeito', async () => {
    const { caso, arquivarFicha, fichaDaDt01, rotina } = await iniciar();
    await arquivarFicha.executar(fichaDaDt01);

    const falha = await caso.executar(rotina('Quarta').id).catch((erro: unknown) => erro);

    expect(erroDe(falha)).toMatchObject({ campo: 'ficha ativa' });
  });

  it('uma rotina que não existe é recusada, com o valor recebido', async () => {
    const { caso, sessoes, gerador } = await iniciar();
    const inexistente: Identificador = gerador.gerar();

    const falha = await caso.executar(inexistente).catch((erro: unknown) => erro);

    expect(erroDe(falha)).toMatchObject({ campo: 'rotina', recebido: inexistente.valor });
    expect(erroDe(falha).esperado).toBe('rotina da versão atual da ficha ativa');
    expect(await sessoes.buscarSessaoEmAndamento()).toBeNull();
  });

  it('a rotina de outra ficha é recusada', async () => {
    const { caso, fichas, fichaCompleta } = await iniciar();
    const deOutra = (await fichas.buscarVersaoAtual(fichaCompleta))!.rotinas[0].id;

    const falha = await caso.executar(deOutra).catch((erro: unknown) => erro);

    expect(erroDe(falha)).toMatchObject({ campo: 'rotina', recebido: deOutra.valor });
  });

  it('a rotina de uma versão antiga é recusada: só vale a versão atual', async () => {
    const { caso, salvarFicha, ids, fichaDaDt01, rotina } = await iniciar();
    const antiga = rotina('Quarta').id;
    await salvarFicha.executar({ ...pedidoDaDt01(ids), fichaId: fichaDaDt01, motivo: 'ajuste' });

    const falha = await caso.executar(antiga).catch((erro: unknown) => erro);

    expect(erroDe(falha)).toMatchObject({ campo: 'rotina', recebido: antiga.valor });
  });
});
