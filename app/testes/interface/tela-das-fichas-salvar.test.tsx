import { fireEvent, render, screen } from '@testing-library/react-native';
import { Component, type ReactNode } from 'react';
import { Text } from 'react-native';

import type { SalvarFicha } from '../../src/aplicacao/casos-de-uso/salvar-ficha';
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

async function abrirEdicaoDe(nome: string, salvarFicha?: SalvarFicha, pronto?: Pronto) {
  const dados = pronto ?? (await fichasParaTela());
  await render(
    <LimiteDeErro>
      <TelaDasFichas
        listarFichas={dados.listarFichas}
        lerFichaParaEdicao={dados.lerFichaParaEdicao}
        buscarExercicios={dados.buscarExercicios}
        salvarFicha={salvarFicha}
      />
    </LimiteDeErro>,
  );
  await fireEvent.press(await screen.findByRole('button', { name: t.abrirFicha(nome) }));
  await fireEvent.press(await screen.findByRole('button', { name: t.editar }));
  return dados;
}

const campo = (nome: keyof typeof t.campo, rotina: string, ordem: number) =>
  screen.getByLabelText(t.rotuloDoCampo(t.campo[nome], rotina, ordem));

// O aviso começa pela rotina e pela linha, seguidas do valor recebido (seção 5 do AGENTS.md).
const escapar = (texto: string) => texto.replace(/[.*+?^${}()|[\]\\/]/g, (c) => `\\${c}`);
const aviso = (campo: string, recebido: string) => {
  const inicio = `${campo}. Valor recebido: ${recebido}.`;
  return screen.findByText(new RegExp(`^${escapar(inicio)}`));
};

async function salvar() {
  await fireEvent.press(await screen.findByRole('button', { name: t.salvar }));
}

describe('salvar a ficha pela tela: edição válida (US-007c3)', () => {
  it('sem o SalvarFicha a edição não oferece o botão de salvar', async () => {
    await abrirEdicaoDe(NOME_DA_FICHA_COMPLETA);

    expect(screen.queryByRole('button', { name: t.salvar })).toBeNull();
  });

  it('grava uma versão nova, mostra o número dela e a ficha lida já traz a mudança', async () => {
    const pronto = await fichasParaTela();
    await abrirEdicaoDe(NOME_DA_FICHA_COMPLETA, pronto.salvarFicha, pronto);
    await fireEvent.changeText(campo('meta', 'Treino A', 1), '8-12');

    await salvar();

    expect(await screen.findByText(t.versaoSalva(3))).toBeTruthy();
    expect(screen.getByText(t.meta('8-12'))).toBeTruthy();
    const versoes = await pronto.fichas.listarVersoes(pronto.fichaCompleta);
    expect(versoes.map((v) => v.numero)).toEqual([1, 2, 3]);
    expect(versoes[2].rotinas[0].itens[0].series.map((s) => s.meta.tipo)).toEqual([
      'faixa',
      'faixa',
      'faixa',
      'faixa',
    ]);
  });

  it('as versões anteriores continuam idênticas depois de salvar (RB02)', async () => {
    const pronto = await fichasParaTela();
    const antes = await pronto.fichas.listarVersoes(pronto.fichaCompleta);
    await abrirEdicaoDe(NOME_DA_FICHA_COMPLETA, pronto.salvarFicha, pronto);
    await fireEvent.changeText(campo('carga', 'Treino A', 1), '70');

    await salvar();
    await screen.findByText(t.versaoSalva(3));

    const depois = await pronto.fichas.listarVersoes(pronto.fichaCompleta);
    expect(depois.slice(0, 2)).toEqual(antes);
  });

  it('o motivo é opcional: preenchido fica na versão, em branco fica vazio', async () => {
    const pronto = await fichasParaTela();
    await abrirEdicaoDe(NOME_DA_FICHA_DT01, pronto.salvarFicha, pronto);
    await fireEvent.changeText(campo('meta', 'Segunda', 1), '12');
    await fireEvent.changeText(screen.getByLabelText(t.motivo), 'mais volume');
    await salvar();
    await screen.findByText(t.versaoSalva(2));

    await fireEvent.press(screen.getByRole('button', { name: t.editar }));
    await fireEvent.changeText(campo('meta', 'Segunda', 1), '10');
    await salvar();
    await screen.findByText(t.versaoSalva(3));

    const versoes = await pronto.fichas.listarVersoes(pronto.fichaDaDt01);
    expect(versoes.map((v) => v.motivo)).toEqual([null, 'mais volume', null]);
  });

  it('trocar o exercício de uma linha e salvar grava o exercício novo', async () => {
    const pronto = await fichasParaTela();
    await abrirEdicaoDe(NOME_DA_FICHA_DT01, pronto.salvarFicha, pronto);
    await fireEvent.press(
      await screen.findByRole('button', { name: t.trocarExercicio('Segunda', 1) }),
    );
    await fireEvent.press(
      await screen.findByRole('button', { name: t.escolherExercicio('Corrida') }),
    );

    await salvar();

    expect(await screen.findByText(t.exercicio(1, 'Corrida'))).toBeTruthy();
    const atual = await pronto.fichas.buscarVersaoAtual(pronto.fichaDaDt01);
    expect(atual?.rotinas[0].itens[0].exercicioId).toEqual(pronto.ids.get('Corrida'));
  });
});

describe('salvar a ficha pela tela: salvamento bloqueado (US-007c3)', () => {
  it('a meta inválida bloqueia, diz a rotina e a linha, o valor recebido e o formato esperado', async () => {
    const pronto = await fichasParaTela();
    await abrirEdicaoDe(NOME_DA_FICHA_COMPLETA, pronto.salvarFicha, pronto);
    await fireEvent.changeText(campo('meta', 'Treino A', 1), 'abc');

    await salvar();

    const bloqueio = await aviso('Treino A, linha 1: meta', 'abc');
    expect(bloqueio.props.children).toMatch(/Formato esperado: repetições \(10\), faixa/);
    expect(await pronto.fichas.listarVersoes(pronto.fichaCompleta)).toHaveLength(2);
  });

  it('a lista de descanso com quantidade errada bloqueia indicando a linha', async () => {
    await abrirEdicaoDe(NOME_DA_FICHA_COMPLETA, (await fichasParaTela()).salvarFicha);
    await fireEvent.changeText(campo('descanso', 'Treino A', 1), '90/90');

    await salvar();

    expect(await aviso('Treino A, linha 1: descanso', '90/90')).toBeTruthy();
  });

  it('a quantidade de séries inválida bloqueia indicando a linha', async () => {
    await abrirEdicaoDe(NOME_DA_FICHA_COMPLETA, (await fichasParaTela()).salvarFicha);
    await fireEvent.changeText(campo('quantidade', 'Treino A', 2), 'abc');

    await salvar();

    expect(await aviso('Treino A, linha 2: séries', 'abc')).toBeTruthy();
  });

  it('a técnica fora da lista bloqueia indicando a linha', async () => {
    await abrirEdicaoDe(NOME_DA_FICHA_COMPLETA, (await fichasParaTela()).salvarFicha);
    await fireEvent.changeText(campo('tecnica', 'Treino A', 3), 'supersérie');

    await salvar();

    expect(await aviso('Treino A, linha 3: técnica', 'supersérie')).toBeTruthy();
  });

  it('nada do que foi digitado se perde: os campos continuam como estavam', async () => {
    await abrirEdicaoDe(NOME_DA_FICHA_COMPLETA, (await fichasParaTela()).salvarFicha);
    await fireEvent.changeText(campo('meta', 'Treino A', 1), 'abc');
    await fireEvent.changeText(campo('carga', 'Treino A', 1), '70');
    await fireEvent.changeText(screen.getByLabelText(t.motivo), 'tentativa');

    await salvar();
    await screen.findByText(/Valor recebido: abc/);

    expect(campo('meta', 'Treino A', 1).props.value).toBe('abc');
    expect(campo('carga', 'Treino A', 1).props.value).toBe('70');
    expect(screen.getByLabelText(t.motivo).props.value).toBe('tentativa');
  });

  it('corrigir o campo e salvar de novo grava a versão e some com o aviso', async () => {
    const pronto = await fichasParaTela();
    await abrirEdicaoDe(NOME_DA_FICHA_COMPLETA, pronto.salvarFicha, pronto);
    await fireEvent.changeText(campo('meta', 'Treino A', 1), 'abc');
    await salvar();
    await screen.findByText(/Valor recebido: abc/);

    await fireEvent.changeText(campo('meta', 'Treino A', 1), '8-12');
    await salvar();

    expect(await screen.findByText(t.versaoSalva(3))).toBeTruthy();
    expect(screen.queryByText(/Valor recebido: abc/)).toBeNull();
  });
});

describe('salvar a ficha pela tela: falha que não é de validação (US-007c3)', () => {
  it('vai para o limite de erro, que registra e avisa, em vez de ser engolida', async () => {
    const quebrado = {
      executar: jest.fn().mockRejectedValue(new Error('banco quebrou')),
    } as unknown as SalvarFicha;
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
    await abrirEdicaoDe(NOME_DA_FICHA_DT01, quebrado);

    await salvar();

    expect(await screen.findByText('Caiu: banco quebrou')).toBeTruthy();
  });
});
