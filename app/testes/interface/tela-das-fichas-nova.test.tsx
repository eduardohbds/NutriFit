import { fireEvent, render, screen } from '@testing-library/react-native';

import { TelaDasFichas } from '../../src/interface/telas/tela-das-fichas';
import { textos } from '../../src/interface/textos';
import {
  NOME_DA_FICHA_COMPLETA,
  NOME_DA_FICHA_DT01,
  fichasParaTela,
} from '../apoio/fichas-de-tela';

const t = textos.fichas;

type Pronto = Awaited<ReturnType<typeof fichasParaTela>>;

async function abrirLista(comEdicao = true) {
  const pronto = await fichasParaTela();
  await render(
    <TelaDasFichas
      listarFichas={pronto.listarFichas}
      lerFichaParaEdicao={pronto.lerFichaParaEdicao}
      buscarExercicios={comEdicao ? pronto.buscarExercicios : undefined}
      salvarFicha={comEdicao ? pronto.salvarFicha : undefined}
    />,
  );
  await screen.findByText(NOME_DA_FICHA_DT01);
  return pronto;
}

const botao = (nome: string) => screen.queryByRole('button', { name: nome });

async function tocar(nome: string) {
  await fireEvent.press(await screen.findByRole('button', { name: nome }));
}

async function comecarFichaNova(tipo: string) {
  await tocar(t.novaFicha);
  await tocar(tipo);
}

async function fichasGravadas(pronto: Pronto) {
  return pronto.fichas.listarFichas();
}

describe('Nova ficha na lista (US-007d4)', () => {
  it('a lista oferece Nova ficha, e sem a edição completa a lista fica só de leitura', async () => {
    await abrirLista(false);

    expect(botao(t.novaFicha)).toBeNull();
  });

  it('Nova ficha pergunta como as rotinas se identificam, com as duas opções e cancelar', async () => {
    await abrirLista();

    await tocar(t.novaFicha);

    expect(await screen.findByText(t.escolherTipoDeRotina)).toBeTruthy();
    expect(botao(t.tipoPorDia)).toBeTruthy();
    expect(botao(t.tipoPorRotacao)).toBeTruthy();
    expect(botao(t.cancelarNovaFicha)).toBeTruthy();
  });

  it('cancelar a escolha do tipo volta à lista, sem criar nada', async () => {
    const pronto = await abrirLista();
    await tocar(t.novaFicha);

    await tocar(t.cancelarNovaFicha);

    expect(await screen.findByText(NOME_DA_FICHA_DT01)).toBeTruthy();
    expect(await fichasGravadas(pronto)).toHaveLength(2);
  });

  it('escolhido o tipo, abre o editor vazio: nome em branco, nenhuma rotina e Nova rotina', async () => {
    await abrirLista();

    await comecarFichaNova(t.tipoPorDia);

    expect((await screen.findByLabelText(t.nomeDaFicha)).props.value).toBe('');
    expect(screen.queryByLabelText(t.nomeDaRotina(1))).toBeNull();
    expect(botao(t.novaRotina)).toBeTruthy();
    expect(botao(t.salvar)).toBeTruthy();
    expect(botao(t.cancelarEdicao)).toBeTruthy();
  });

  it('o tipo escolhido manda na rotina nova: Segunda por dia da semana, Treino A por rotação', async () => {
    await abrirLista();
    await comecarFichaNova(t.tipoPorDia);
    await tocar(t.novaRotina);
    expect((await screen.findByLabelText(t.nomeDaRotina(1))).props.value).toBe('Segunda');

    await tocar(t.cancelarEdicao);
    await comecarFichaNova(t.tipoPorRotacao);
    await tocar(t.novaRotina);

    expect((await screen.findByLabelText(t.nomeDaRotina(1))).props.value).toBe('Treino A');
  });

  it('cancelar a edição da ficha nova volta à lista, sem criar nada', async () => {
    const pronto = await abrirLista();
    await comecarFichaNova(t.tipoPorDia);
    await fireEvent.changeText(await screen.findByLabelText(t.nomeDaFicha), 'Treino novo');

    await tocar(t.cancelarEdicao);

    expect(await screen.findByText(NOME_DA_FICHA_COMPLETA)).toBeTruthy();
    expect(screen.queryByText('Treino novo')).toBeNull();
    expect(await fichasGravadas(pronto)).toHaveLength(2);
  });
});

describe('salvar uma ficha nova montada na tela (US-007d4)', () => {
  async function montarFichaNova(pronto: Pronto, tipo: string) {
    await comecarFichaNova(tipo);
    await fireEvent.changeText(await screen.findByLabelText(t.nomeDaFicha), 'Treino novo');
    await tocar(t.novaRotina);
    const rotina = (await screen.findByLabelText(t.nomeDaRotina(1))).props.value as string;
    await tocar(t.adicionarLinha(rotina));
    await tocar(t.escolherExercicio('Supino Reto'));
    return { rotina, pronto };
  }

  it('a ficha nova nasce inativa, na versão 1, e a tela mostra Versão 1 salva', async () => {
    const pronto = await abrirLista();
    await montarFichaNova(pronto, t.tipoPorDia);

    await tocar(t.salvar);

    expect(await screen.findByText(t.versaoSalva(1))).toBeTruthy();
    const gravadas = await fichasGravadas(pronto);
    expect(gravadas).toHaveLength(3);
    const nova = gravadas.find((f) => f.nome === 'Treino novo');
    expect(nova).toMatchObject({ situacao: 'inativa', origem: 'manual' });
    const versoes = await pronto.fichas.listarVersoes(nova!.id);
    expect(versoes.map((v) => v.numero)).toEqual([1]);
    expect(versoes[0].rotinas.map((r) => [r.nome, r.diaDaSemana, r.itens.length])).toEqual([
      ['Segunda', 1, 1],
    ]);
  });

  it('por rotação, a rotina grava sem dia da semana', async () => {
    const pronto = await abrirLista();
    await montarFichaNova(pronto, t.tipoPorRotacao);

    await tocar(t.salvar);
    await screen.findByText(t.versaoSalva(1));

    const nova = (await fichasGravadas(pronto)).find((f) => f.nome === 'Treino novo');
    const versao = (await pronto.fichas.buscarVersaoAtual(nova!.id))!;
    expect(versao.rotinas.map((r) => [r.nome, r.diaDaSemana])).toEqual([['Treino A', null]]);
  });

  it('a ficha nova aparece na lista como inativa e na versão 1, sem tirar a ativa de ninguém', async () => {
    const pronto = await abrirLista();
    await montarFichaNova(pronto, t.tipoPorDia);
    await tocar(t.salvar);
    await screen.findByText(t.versaoSalva(1));

    await tocar(t.voltar);

    expect(await screen.findByText('Treino novo')).toBeTruthy();
    expect(screen.getAllByText(t.situacao.inativa)).toHaveLength(3);
    expect(screen.queryByText(t.situacao.ativa)).toBeNull();
    expect(screen.getAllByText(t.versao(1))).toHaveLength(2);
  });

  it('sem nome, o salvamento é bloqueado dizendo o valor recebido, e nada é criado', async () => {
    const pronto = await abrirLista();
    await comecarFichaNova(t.tipoPorDia);
    await tocar(t.novaRotina);

    await tocar(t.salvar);

    expect(
      await screen.findByText(/^nome da ficha\. Valor recebido: \. Formato esperado/),
    ).toBeTruthy();
    expect(await fichasGravadas(pronto)).toHaveLength(2);
  });

  it('sem rotinas, o salvamento é bloqueado, e o nome digitado fica', async () => {
    const pronto = await abrirLista();
    await comecarFichaNova(t.tipoPorDia);
    await fireEvent.changeText(await screen.findByLabelText(t.nomeDaFicha), 'Treino novo');

    await tocar(t.salvar);

    expect(await screen.findByText(/^rotinas\. Valor recebido: 0 rotinas\./)).toBeTruthy();
    expect(screen.getByLabelText(t.nomeDaFicha).props.value).toBe('Treino novo');
    expect(await fichasGravadas(pronto)).toHaveLength(2);
  });

  it('corrigir o que faltava e salvar de novo cria a ficha, e o aviso some', async () => {
    const pronto = await abrirLista();
    await comecarFichaNova(t.tipoPorRotacao);
    await fireEvent.changeText(await screen.findByLabelText(t.nomeDaFicha), 'Treino novo');
    await tocar(t.salvar);
    await screen.findByText(/Valor recebido: 0 rotinas/);

    await tocar(t.novaRotina);
    await tocar(t.adicionarLinha('Treino A'));
    await tocar(t.escolherExercicio('Corrida'));
    await tocar(t.salvar);

    expect(await screen.findByText(t.versaoSalva(1))).toBeTruthy();
    expect(screen.queryByText(/Valor recebido: 0 rotinas/)).toBeNull();
    expect(await fichasGravadas(pronto)).toHaveLength(3);
  });
});
