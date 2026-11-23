import { fireEvent, render, screen, within } from '@testing-library/react-native';
import { Component, type ReactNode } from 'react';
import { Text } from 'react-native';

import type { AtivarFicha } from '../../src/aplicacao/casos-de-uso/ativar-ficha';
import { TelaDasFichas } from '../../src/interface/telas/tela-das-fichas';
import { textos } from '../../src/interface/textos';
import {
  NOME_DA_FICHA_COMPLETA,
  NOME_DA_FICHA_DT01,
  fichasParaTela,
} from '../apoio/fichas-de-tela';

const t = textos.fichas;

type Pronto = Awaited<ReturnType<typeof fichasParaTela>>;

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

async function abrirLista(pronto: Pronto, comSituacao = true, ativar?: AtivarFicha) {
  await render(
    <LimiteDeErro>
      <TelaDasFichas
        listarFichas={pronto.listarFichas}
        lerFichaParaEdicao={pronto.lerFichaParaEdicao}
        ativarFicha={comSituacao ? (ativar ?? pronto.ativarFicha) : undefined}
        duplicarFicha={comSituacao ? pronto.duplicarFicha : undefined}
        arquivarFicha={comSituacao ? pronto.arquivarFicha : undefined}
      />
    </LimiteDeErro>,
  );
  await screen.findByText(NOME_DA_FICHA_DT01);
}

const botao = (nome: string) => screen.queryByRole('button', { name: nome });

async function tocar(nome: string) {
  await fireEvent.press(await screen.findByRole('button', { name: nome }));
}

const linhaDa = (id: { valor: string }) => within(screen.getByTestId(`ficha-${id.valor}`));

describe('botões de situação na lista de fichas (US-009b)', () => {
  it('sem os casos de uso a lista não mostra os botões de ativar, duplicar e arquivar', async () => {
    await abrirLista(await fichasParaTela(), false);

    expect(botao(t.ativarFicha(NOME_DA_FICHA_DT01))).toBeNull();
    expect(botao(t.duplicarFicha(NOME_DA_FICHA_DT01))).toBeNull();
    expect(botao(t.arquivarFicha(NOME_DA_FICHA_DT01))).toBeNull();
  });

  it('cada ficha oferece Ativar, Duplicar e Arquivar com o nome dela', async () => {
    await abrirLista(await fichasParaTela());

    for (const nome of [NOME_DA_FICHA_DT01, NOME_DA_FICHA_COMPLETA]) {
      expect(botao(t.ativarFicha(nome))).toBeTruthy();
      expect(botao(t.duplicarFicha(nome))).toBeTruthy();
      expect(botao(t.arquivarFicha(nome))).toBeTruthy();
    }
  });
});

describe('ativar uma ficha pela lista (US-009b, SL09)', () => {
  it('a ficha passa a aparecer como ativa, e a anterior como inativa', async () => {
    const pronto = await fichasParaTela();
    await abrirLista(pronto);
    await tocar(t.ativarFicha(NOME_DA_FICHA_DT01));
    await linhaDa(pronto.fichaDaDt01).findByText(t.situacao.ativa);

    await tocar(t.ativarFicha(NOME_DA_FICHA_COMPLETA));

    await linhaDa(pronto.fichaCompleta).findByText(t.situacao.ativa);
    expect(linhaDa(pronto.fichaDaDt01).getByText(t.situacao.inativa)).toBeTruthy();
    expect(screen.getAllByText(t.situacao.ativa)).toHaveLength(1);
  });

  it('a ficha ativa não oferece o botão Ativar, e a lista a põe em primeiro lugar', async () => {
    const pronto = await fichasParaTela();
    await abrirLista(pronto);

    await tocar(t.ativarFicha(NOME_DA_FICHA_COMPLETA));

    await linhaDa(pronto.fichaCompleta).findByText(t.situacao.ativa);
    expect(botao(t.ativarFicha(NOME_DA_FICHA_COMPLETA))).toBeNull();
    expect(botao(t.ativarFicha(NOME_DA_FICHA_DT01))).toBeTruthy();
    const nomes = screen
      .getAllByRole('button', { name: /^Abrir / })
      .map((b) => b.props.accessibilityLabel);
    expect(nomes).toEqual([t.abrirFicha(NOME_DA_FICHA_COMPLETA), t.abrirFicha(NOME_DA_FICHA_DT01)]);
  });

  it('a falha que não é de validação vai para o limite de erro, que registra e avisa', async () => {
    const pronto = await fichasParaTela();
    const quebrado = { executar: jest.fn().mockRejectedValue(new Error('banco quebrou')) };
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
    await abrirLista(pronto, true, quebrado as unknown as AtivarFicha);

    await tocar(t.ativarFicha(NOME_DA_FICHA_DT01));

    expect(await screen.findByText('Caiu: banco quebrou')).toBeTruthy();
  });
});

describe('duplicar uma ficha pela lista (US-009b)', () => {
  it('a cópia aparece na lista como inativa, na versão 1, e a original continua', async () => {
    const pronto = await fichasParaTela();
    await abrirLista(pronto);

    await tocar(t.duplicarFicha(NOME_DA_FICHA_DT01));

    const copia = `${NOME_DA_FICHA_DT01} (cópia)`;
    expect(await screen.findByText(copia)).toBeTruthy();
    expect(screen.getByText(NOME_DA_FICHA_DT01)).toBeTruthy();
    expect(screen.getAllByText(t.situacao.inativa)).toHaveLength(3);
    expect(screen.getAllByText(t.versao(1))).toHaveLength(2);
    expect((await pronto.fichas.listarFichas()).map((f) => f.origem)).toContain('duplicada');
  });
});

describe('arquivar uma ficha pela lista (US-009b, RB04)', () => {
  it('pede confirmação dizendo o nome e que versões e sessões continuam guardadas', async () => {
    await abrirLista(await fichasParaTela());

    await tocar(t.arquivarFicha(NOME_DA_FICHA_DT01));

    expect(await screen.findByText(t.confirmarArquivar(NOME_DA_FICHA_DT01))).toBeTruthy();
    expect(botao(t.confirmarArquivamento)).toBeTruthy();
    expect(botao(t.cancelarArquivamento)).toBeTruthy();
  });

  it('sem confirmar nada muda: a ficha continua na lista e no banco', async () => {
    const pronto = await fichasParaTela();
    await abrirLista(pronto);
    await tocar(t.arquivarFicha(NOME_DA_FICHA_DT01));
    await screen.findByText(t.confirmarArquivar(NOME_DA_FICHA_DT01));

    await tocar(t.cancelarArquivamento);

    expect(await screen.findByText(NOME_DA_FICHA_DT01)).toBeTruthy();
    expect(screen.queryByText(t.confirmarArquivar(NOME_DA_FICHA_DT01))).toBeNull();
    const situacoes = (await pronto.fichas.listarFichas()).map((f) => f.situacao);
    expect(situacoes).toEqual(['inativa', 'inativa']);
  });

  it('ao confirmar, a ficha some da lista e continua guardada com as versões', async () => {
    const pronto = await fichasParaTela();
    const versoesAntes = await pronto.fichas.listarVersoes(pronto.fichaCompleta);
    await abrirLista(pronto);
    await tocar(t.arquivarFicha(NOME_DA_FICHA_COMPLETA));
    await screen.findByText(t.confirmarArquivar(NOME_DA_FICHA_COMPLETA));

    await tocar(t.confirmarArquivamento);

    expect(await screen.findByText(NOME_DA_FICHA_DT01)).toBeTruthy();
    expect(screen.queryByText(NOME_DA_FICHA_COMPLETA)).toBeNull();
    const guardada = (await pronto.fichas.listarFichas()).find(
      (f) => f.id.valor === pronto.fichaCompleta.valor,
    );
    expect(guardada?.situacao).toBe('arquivada');
    expect(await pronto.fichas.listarVersoes(pronto.fichaCompleta)).toEqual(versoesAntes);
  });
});
