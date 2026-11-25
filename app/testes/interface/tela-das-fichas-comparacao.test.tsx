import { fireEvent, render, screen } from '@testing-library/react-native';

import type { TextosDasSeries } from '../../src/dominio/textos-das-series';
import { TelaDasFichas } from '../../src/interface/telas/tela-das-fichas';
import { textos } from '../../src/interface/textos';
import { NOME_DA_FICHA_DT01 } from '../apoio/fichas-de-tela';
import { NOME_DA_FICHA_EDITADA, fichaEditadaTresVezes } from '../apoio/ficha-editada-tres-vezes';

const t = textos.fichas;

const listas = (carga: string | null): TextosDasSeries => ({
  quantidade: 3,
  meta: '10',
  carga,
  tecnica: null,
  descanso: null,
});

async function abrirHistorico(opcoes: { comparacao?: boolean; ficha?: string } = {}) {
  const pronto = await fichaEditadaTresVezes();
  await render(
    <TelaDasFichas
      listarFichas={pronto.listarFichas}
      lerFichaParaEdicao={pronto.lerFichaParaEdicao}
      historicoDaFicha={pronto.historicoDaFicha}
      restaurarVersao={pronto.restaurarVersao}
      compararVersoes={opcoes.comparacao === false ? undefined : pronto.compararVersoes}
    />,
  );
  const nome = opcoes.ficha ?? NOME_DA_FICHA_EDITADA;
  await fireEvent.press(await screen.findByRole('button', { name: t.abrirFicha(nome) }));
  await fireEvent.press(await screen.findByRole('button', { name: t.historico }));
  await screen.findByText(t.tituloDoHistorico(nome));
  return pronto;
}

const botao = (nome: string) => screen.queryByRole('button', { name: nome });

async function tocar(nome: string) {
  await fireEvent.press(await screen.findByRole('button', { name: nome }));
}

async function compararVersoes(primeira: number, segunda: number) {
  await tocar(t.escolherParaComparar(primeira));
  await tocar(t.escolherParaComparar(segunda));
  await tocar(t.compararVersoes);
}

describe('escolher as versões para comparar no histórico (US-010c)', () => {
  it('sem o CompararVersoes o histórico não oferece escolher versões', async () => {
    await abrirHistorico({ comparacao: false });

    expect(botao(t.escolherParaComparar(1))).toBeNull();
    expect(botao(t.compararVersoes)).toBeNull();
  });

  it('a ficha com uma única versão não tem o que comparar', async () => {
    await abrirHistorico({ ficha: NOME_DA_FICHA_DT01 });

    expect(botao(t.escolherParaComparar(1))).toBeNull();
  });

  it('cada versão pode ser escolhida e desmarcada, e Comparar só aparece com duas escolhidas', async () => {
    await abrirHistorico();
    expect(botao(t.compararVersoes)).toBeNull();

    await tocar(t.escolherParaComparar(2));
    expect(botao(t.desmarcarComparacao(2))).toBeTruthy();
    expect(botao(t.compararVersoes)).toBeNull();

    await tocar(t.escolherParaComparar(3));
    expect(botao(t.compararVersoes)).toBeTruthy();

    await tocar(t.desmarcarComparacao(2));
    expect(botao(t.escolherParaComparar(2))).toBeTruthy();
    expect(botao(t.compararVersoes)).toBeNull();
  });

  it('uma terceira escolha tira a primeira, e ficam sempre só duas', async () => {
    await abrirHistorico();
    await tocar(t.escolherParaComparar(1));
    await tocar(t.escolherParaComparar(2));

    await tocar(t.escolherParaComparar(4));

    expect(botao(t.escolherParaComparar(1))).toBeTruthy();
    expect(botao(t.desmarcarComparacao(2))).toBeTruthy();
    expect(botao(t.desmarcarComparacao(4))).toBeTruthy();
    expect(botao(t.compararVersoes)).toBeTruthy();
  });
});

describe('comparação lado a lado na tela (US-010c)', () => {
  it('mostra o título, as duas versões como colunas e a rotina', async () => {
    await abrirHistorico();

    await compararVersoes(2, 3);

    expect(await screen.findByText(t.tituloDaComparacao(2, 3))).toBeTruthy();
    expect(screen.getByText(t.versao(2))).toBeTruthy();
    expect(screen.getByText(t.versao(3))).toBeTruthy();
    expect(screen.getByText('Treino A')).toBeTruthy();
  });

  it('a linha alterada mostra as duas versões dela lado a lado e a marca com os campos', async () => {
    await abrirHistorico();

    await compararVersoes(2, 3);

    expect(await screen.findByText(t.marcaAlterada(['carga']))).toBeTruthy();
    // Sem carga: o Supino da esquerda e a Remada, igual, dos dois lados. Com 60 kg: só o Supino da direita.
    expect(screen.getAllByText(t.resumoDaLinha(listas(null)))).toHaveLength(3);
    expect(screen.getAllByText(t.resumoDaLinha(listas('60')))).toHaveLength(1);
    expect(screen.getAllByText(/^Alterada/)).toHaveLength(1);
  });

  it('a linha igual aparece dos dois lados, sem marca', async () => {
    await abrirHistorico();

    await compararVersoes(2, 3);

    await screen.findByText(t.tituloDaComparacao(2, 3));
    expect(screen.getAllByText(t.exercicio(2, 'Remada Curvada'))).toHaveLength(2);
    expect(screen.queryByText(t.marcaAdicionada)).toBeNull();
    expect(screen.queryByText(t.marcaRemovida)).toBeNull();
  });

  it('a linha adicionada tem a marca e só o lado da versão maior', async () => {
    await abrirHistorico();

    await compararVersoes(1, 2);

    expect(await screen.findByText(t.marcaAdicionada)).toBeTruthy();
    expect(screen.getAllByText(t.exercicio(2, 'Remada Curvada'))).toHaveLength(1);
    expect(screen.getAllByText(t.semLinha)).toHaveLength(1);
  });

  it('a linha removida tem a marca e só o lado da versão menor', async () => {
    await abrirHistorico();

    await compararVersoes(3, 4);

    expect(await screen.findByText(t.marcaRemovida)).toBeTruthy();
    expect(screen.getAllByText(t.exercicio(2, 'Remada Curvada'))).toHaveLength(1);
  });

  it('a menor versão fica à esquerda, qualquer que seja a ordem da escolha', async () => {
    await abrirHistorico();

    await compararVersoes(4, 1);

    expect(await screen.findByText(t.tituloDaComparacao(1, 4))).toBeTruthy();
  });

  it('voltar leva ao histórico, e nada é gravado em nenhum momento', async () => {
    const pronto = await abrirHistorico();
    const antes = await pronto.fichas.listarVersoes(pronto.fichaId);
    await compararVersoes(1, 4);
    await screen.findByText(t.tituloDaComparacao(1, 4));

    await tocar(t.voltarParaHistorico);

    expect(await screen.findByText(t.tituloDoHistorico(NOME_DA_FICHA_EDITADA))).toBeTruthy();
    expect(await pronto.fichas.listarVersoes(pronto.fichaId)).toEqual(antes);
  });
});
