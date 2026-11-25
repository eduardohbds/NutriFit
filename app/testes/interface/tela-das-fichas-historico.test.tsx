import { fireEvent, render, screen } from '@testing-library/react-native';
import { Component, type ReactNode } from 'react';
import { Text } from 'react-native';

import type { RestaurarVersao } from '../../src/aplicacao/casos-de-uso/restaurar-versao';
import { formatarDataEHora } from '../../src/interface/formatacao';
import { TelaDasFichas } from '../../src/interface/telas/tela-das-fichas';
import { textos } from '../../src/interface/textos';
import { NOME_DA_FICHA_DT01 } from '../apoio/fichas-de-tela';
import { NOME_DA_FICHA_EDITADA, fichaEditadaTresVezes } from '../apoio/ficha-editada-tres-vezes';
import { InstanteUtc } from '../../src/dominio/instante-utc';

const t = textos.fichas;

class LimiteDeErro extends Component<{ children: ReactNode }, { erro: Error | null }> {
  state = { erro: null as Error | null };

  static getDerivedStateFromError(erro: Error) {
    return { erro };
  }

  render() {
    const { erro } = this.state;
    return erro ? <Text>{`Caiu: ${erro.message}`}</Text> : this.props.children;
  }
}

interface Opcoes {
  historico?: boolean;
  restauracao?: boolean | RestaurarVersao;
  ficha?: string;
}

async function abrirHistorico(opcoes: Opcoes = {}) {
  const pronto = await fichaEditadaTresVezes();
  const restaurar =
    opcoes.restauracao === false
      ? undefined
      : typeof opcoes.restauracao === 'object'
        ? opcoes.restauracao
        : pronto.restaurarVersao;
  await render(
    <LimiteDeErro>
      <TelaDasFichas
        listarFichas={pronto.listarFichas}
        lerFichaParaEdicao={pronto.lerFichaParaEdicao}
        historicoDaFicha={opcoes.historico === false ? undefined : pronto.historicoDaFicha}
        restaurarVersao={restaurar}
      />
    </LimiteDeErro>,
  );
  const nome = opcoes.ficha ?? NOME_DA_FICHA_EDITADA;
  await fireEvent.press(await screen.findByRole('button', { name: t.abrirFicha(nome) }));
  if (opcoes.historico !== false) {
    await fireEvent.press(await screen.findByRole('button', { name: t.historico }));
  }
  return pronto;
}

const botao = (nome: string) => screen.queryByRole('button', { name: nome });

async function tocar(nome: string) {
  await fireEvent.press(await screen.findByRole('button', { name: nome }));
}

const numerosNaTela = () =>
  screen.getAllByText(/^Versão \d+$/).map((elemento) => elemento.props.children);

describe('histórico da ficha na tela (US-010b, RF06)', () => {
  it('sem o HistoricoDaFicha a ficha aberta não oferece o botão Histórico', async () => {
    await abrirHistorico({ historico: false });

    await screen.findByText(t.exercicio(1, 'Supino Reto'));
    expect(botao(t.historico)).toBeNull();
  });

  it('abrir o histórico mostra as versões da mais recente para a mais antiga', async () => {
    await abrirHistorico();

    expect(await screen.findByText(t.tituloDoHistorico(NOME_DA_FICHA_EDITADA))).toBeTruthy();
    expect(numerosNaTela()).toEqual(['Versão 4', 'Versão 3', 'Versão 2', 'Versão 1']);
  });

  it('cada versão mostra o autor, a data, o motivo, quando há, e o resumo da diferença', async () => {
    await abrirHistorico();

    await screen.findByText(t.tituloDoHistorico(NOME_DA_FICHA_EDITADA));
    expect(screen.getAllByText(t.autorDaVersao('usuario'))).toHaveLength(4);
    const data = formatarDataEHora(InstanteUtc.de('2026-11-10T13:45:00.000Z'));
    expect(screen.getAllByText(t.dataDaVersao(data))).toHaveLength(4);
    for (const motivo of ['incluí remada', 'subi a carga', 'tirei a remada']) {
      expect(screen.getByText(t.motivoDaVersao(motivo))).toBeTruthy();
    }
    expect(screen.getAllByText(/^Motivo: /)).toHaveLength(3);
    for (const resumo of [
      'Versão inicial',
      '1 linha adicionada',
      '1 linha alterada',
      '1 linha removida',
    ]) {
      expect(screen.getByText(resumo)).toBeTruthy();
    }
  });

  it('Restaurar aparece nas versões anteriores e não na atual', async () => {
    await abrirHistorico();

    await screen.findByText(t.tituloDoHistorico(NOME_DA_FICHA_EDITADA));
    for (const numero of [1, 2, 3]) expect(botao(t.restaurarVersao(numero))).toBeTruthy();
    expect(botao(t.restaurarVersao(4))).toBeNull();
  });

  it('a ficha com uma única versão não oferece restauração em nenhuma linha', async () => {
    await abrirHistorico({ ficha: NOME_DA_FICHA_DT01 });

    await screen.findByText(t.tituloDoHistorico(NOME_DA_FICHA_DT01));
    expect(numerosNaTela()).toEqual(['Versão 1']);
    expect(screen.queryAllByRole('button', { name: /^Restaurar versão/ })).toHaveLength(0);
  });

  it('sem o RestaurarVersao o histórico só lê, sem nenhum botão Restaurar', async () => {
    await abrirHistorico({ restauracao: false });

    await screen.findByText(t.tituloDoHistorico(NOME_DA_FICHA_EDITADA));
    expect(screen.queryAllByRole('button', { name: /^Restaurar versão/ })).toHaveLength(0);
  });

  it('abrir o histórico não grava nada, e voltar leva à ficha', async () => {
    const pronto = await abrirHistorico();
    const antes = await pronto.fichas.listarVersoes(pronto.fichaId);
    await screen.findByText(t.tituloDoHistorico(NOME_DA_FICHA_EDITADA));

    await tocar(t.voltarParaFicha);

    expect(await screen.findByText(t.exercicio(1, 'Supino Reto'))).toBeTruthy();
    expect(await pronto.fichas.listarVersoes(pronto.fichaId)).toEqual(antes);
  });
});

describe('restaurar uma versão pela tela (US-010b, FL04, CE16)', () => {
  it('pede confirmação dizendo quantas mudanças posteriores deixam de valer', async () => {
    await abrirHistorico();

    await tocar(t.restaurarVersao(2));

    expect(await screen.findByText(t.confirmarRestauracao(2, 2))).toBeTruthy();
    expect(botao(t.confirmarRestauracaoBotao)).toBeTruthy();
    expect(botao(t.cancelarRestauracao)).toBeTruthy();
  });

  it('com uma só mudança posterior, a confirmação fala no singular', async () => {
    await abrirHistorico();

    await tocar(t.restaurarVersao(3));

    expect(await screen.findByText(t.confirmarRestauracao(3, 1))).toBeTruthy();
    expect(t.confirmarRestauracao(3, 1)).toMatch(/a mudança posterior deixa de valer/);
  });

  it('sem confirmar nada muda: nenhuma versão nova e a confirmação some', async () => {
    const pronto = await abrirHistorico();
    await tocar(t.restaurarVersao(2));
    await screen.findByText(t.confirmarRestauracao(2, 2));

    await tocar(t.cancelarRestauracao);

    expect(screen.queryByText(t.confirmarRestauracao(2, 2))).toBeNull();
    expect(numerosNaTela()).toEqual(['Versão 4', 'Versão 3', 'Versão 2', 'Versão 1']);
    expect(await pronto.fichas.listarVersoes(pronto.fichaId)).toHaveLength(4);
  });

  it('ao confirmar, grava a versão nova, mostra o número dela e a lista ganha a versão 5', async () => {
    const pronto = await abrirHistorico();
    const antes = await pronto.fichas.listarVersoes(pronto.fichaId);
    await tocar(t.restaurarVersao(2));
    await screen.findByText(t.confirmarRestauracao(2, 2));

    await tocar(t.confirmarRestauracaoBotao);

    expect(await screen.findByText(t.versaoRestaurada(5, 2))).toBeTruthy();
    expect(numerosNaTela()).toEqual(['Versão 5', 'Versão 4', 'Versão 3', 'Versão 2', 'Versão 1']);
    expect(screen.getByText(t.motivoDaVersao('Restaurada a versão 2'))).toBeTruthy();
    expect(screen.queryByText(t.confirmarRestauracao(2, 2))).toBeNull();
    const depois = await pronto.fichas.listarVersoes(pronto.fichaId);
    expect(depois.slice(0, 4)).toEqual(antes);
    expect(depois[4].rotinas[0].itens).toHaveLength(antes[1].rotinas[0].itens.length);
  });

  it('a versão nova vira a atual: sem Restaurar nela, e a ficha aberta mostra o conteúdo restaurado', async () => {
    await abrirHistorico();
    await tocar(t.restaurarVersao(2));
    await tocar(t.confirmarRestauracaoBotao);
    await screen.findByText(t.versaoRestaurada(5, 2));

    expect(botao(t.restaurarVersao(5))).toBeNull();
    expect(botao(t.restaurarVersao(4))).toBeTruthy();
    await tocar(t.voltarParaFicha);

    expect(await screen.findByText(t.exercicio(2, 'Remada Curvada'))).toBeTruthy();
  });

  it('a falha que não é de validação vai para o limite de erro, que registra e avisa', async () => {
    const quebrado = {
      executar: jest.fn().mockRejectedValue(new Error('banco quebrou')),
    } as unknown as RestaurarVersao;
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
    await abrirHistorico({ restauracao: quebrado });
    await tocar(t.restaurarVersao(2));

    await tocar(t.confirmarRestauracaoBotao);

    expect(await screen.findByText('Caiu: banco quebrou')).toBeTruthy();
  });
});
