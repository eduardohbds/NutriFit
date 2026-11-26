import { screen } from '@testing-library/react-native';
import { renderRouter } from 'expo-router/testing-library';

import { textos } from '../../src/interface/textos';
import type { InicioParaTela } from '../apoio/inicio-de-tela';

// A composição liga o SQLite do aparelho, que o Jest não tem; a tela e os casos de uso são reais.
jest.mock('../../src/composicao', () => {
  const { inicioParaTela } = require('../apoio/inicio-de-tela');
  const pronto = inicioParaTela().then(async (inicio: InicioParaTela) => {
    await inicio.ativarFicha.executar(inicio.fichaDaDt01);
    return inicio;
  });
  return {
    casosDoInicio: () => ({
      escolherTreinoDoDia: { executar: async () => (await pronto).escolherTreinoDoDia.executar() },
      lerFichaParaEdicao: {
        executar: async (id: unknown) => (await pronto).lerFichaParaEdicao.executar(id),
      },
    }),
  };
});

describe('rota inicial (US-012b)', () => {
  it('a rota / abre direto no treino de hoje, sem nenhum toque', async () => {
    await renderRouter({ index: require('../../app/index') });

    expect(await screen.findByText(textos.inicio.sugerido)).toBeTruthy();
    expect(screen.getByText(textos.fichas.exercicio(1, 'Desenvolvimento com Barra'))).toBeTruthy();
  });
});
