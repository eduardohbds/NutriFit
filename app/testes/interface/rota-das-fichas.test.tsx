import { fireEvent, screen } from '@testing-library/react-native';
import { renderRouter } from 'expo-router/testing-library';

import { textos } from '../../src/interface/textos';
import { NOME_DA_FICHA_DT01 } from '../apoio/fichas-de-tela';

// A composição liga o SQLite do aparelho, que o Jest não tem; a tela e os casos de uso são reais.
jest.mock('../../src/composicao', () => {
  const { fichasParaTela } = require('../apoio/fichas-de-tela');
  const pronto = fichasParaTela();
  return {
    casosDeFichas: () => ({
      listarFichas: { executar: async () => (await pronto).listarFichas.executar() },
      lerFichaParaEdicao: {
        executar: async (id: unknown) => (await pronto).lerFichaParaEdicao.executar(id),
      },
    }),
  };
});

describe('rotas das fichas (US-007c1)', () => {
  it('a tela inicial leva às fichas', async () => {
    await renderRouter({
      index: require('../../app/index'),
      fichas: require('../../app/fichas'),
    });

    await fireEvent.press(screen.getByRole('link', { name: textos.fichas.abrir }));

    expect(await screen.findByText(NOME_DA_FICHA_DT01)).toBeTruthy();
    expect(screen.getByText(textos.fichas.titulo)).toBeTruthy();
  });
});
