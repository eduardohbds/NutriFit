import { fireEvent, render, screen } from '@testing-library/react-native';

import { TelaDasFichas } from '../../src/interface/telas/tela-das-fichas';
import { textos } from '../../src/interface/textos';
import {
  NOME_DA_FICHA_COMPLETA,
  NOME_DA_FICHA_DT01,
  fichasParaTela,
} from '../apoio/fichas-de-tela';

async function abrir() {
  const { listarFichas, lerFichaParaEdicao } = await fichasParaTela();
  await render(
    <TelaDasFichas listarFichas={listarFichas} lerFichaParaEdicao={lerFichaParaEdicao} />,
  );
}

async function abrirFicha(nome: string) {
  await abrir();
  const botao = await screen.findByRole('button', { name: textos.fichas.abrirFicha(nome) });
  await fireEvent.press(botao);
}

describe('tela das fichas (US-007c1)', () => {
  it('lista as fichas com a situação e a versão atual de cada uma', async () => {
    await abrir();

    expect(await screen.findByText(NOME_DA_FICHA_DT01)).toBeTruthy();
    expect(screen.getByText(NOME_DA_FICHA_COMPLETA)).toBeTruthy();
    expect(screen.getAllByText(textos.fichas.situacao.inativa)).toHaveLength(2);
    expect(screen.getByText(textos.fichas.versao(1))).toBeTruthy();
    expect(screen.getByText(textos.fichas.versao(2))).toBeTruthy();
  });

  it('abrir a DT01 mostra as 5 rotinas e as 30 linhas da versão atual', async () => {
    await abrirFicha(NOME_DA_FICHA_DT01);

    expect(await screen.findByText(textos.fichas.exercicio(1, 'Supino Reto'))).toBeTruthy();
    for (const dia of ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta'])
      expect(screen.getByText(textos.fichas.diaDaSemana(dia))).toBeTruthy();
    expect(screen.getAllByText(/^\d+\. /)).toHaveLength(30);
    expect(screen.getByText(textos.fichas.exercicio(1, 'Esteira'))).toBeTruthy();
    expect(screen.getByText(textos.fichas.observacoes('ou Corrida'))).toBeTruthy();
    expect(screen.getByText(textos.fichas.exercicio(6, 'Rosca de Punho Inversa'))).toBeTruthy();
  });

  it('a linha mostra séries, meta, carga, técnica e descanso como na planilha', async () => {
    await abrirFicha(NOME_DA_FICHA_COMPLETA);

    expect(await screen.findByText(textos.fichas.exercicio(1, 'Supino Reto'))).toBeTruthy();
    expect(screen.getByText(textos.fichas.series(4))).toBeTruthy();
    expect(screen.getByText(textos.fichas.meta('12/10/8/falha'))).toBeTruthy();
    expect(screen.getByText(textos.fichas.carga('60/62,5/65/65'))).toBeTruthy();
    expect(screen.getByText(textos.fichas.tecnica('aquecimento/-/-/-'))).toBeTruthy();
    expect(screen.getByText(textos.fichas.descanso('90/90/90/120'))).toBeTruthy();
  });

  it('a linha mostra o grupo em sequência, o unilateral e as observações', async () => {
    await abrirFicha(NOME_DA_FICHA_COMPLETA);

    await screen.findByText(textos.fichas.exercicio(2, 'Elevação Lateral'));
    expect(screen.getAllByText(textos.fichas.grupo('A'))).toHaveLength(2);
    expect(screen.getAllByText(textos.fichas.unilateral)).toHaveLength(2);
    const observacao = textos.fichas.observacoes('Bi-set com a elevação frontal');
    expect(screen.getByText(observacao)).toBeTruthy();
  });

  it('o botão de voltar leva de novo à lista de fichas', async () => {
    await abrirFicha(NOME_DA_FICHA_DT01);
    await screen.findByText(textos.fichas.exercicio(1, 'Supino Reto'));

    await fireEvent.press(screen.getByRole('button', { name: textos.fichas.voltar }));

    expect(await screen.findByText(NOME_DA_FICHA_COMPLETA)).toBeTruthy();
  });
});
