import { fireEvent, screen } from '@testing-library/react-native';
import { renderRouter } from 'expo-router/testing-library';

import { textos } from '../../src/interface/textos';

// A composição liga o SQLite do aparelho, que o Jest não tem; a tela e os casos de uso são reais.
jest.mock('../../src/composicao', () => {
  const { catalogoInicialParaTela } = require('../apoio/catalogo-de-tela');
  const catalogo = catalogoInicialParaTela();
  return {
    casosDoCatalogo: () => ({
      listarExercicios: catalogo.listarExercicios,
      editarGrupos: catalogo.editarGrupos,
    }),
  };
});

describe('rotas do catálogo', () => {
  it('a tela inicial leva ao catálogo', async () => {
    await renderRouter({
      index: require('../../app/index'),
      catalogo: require('../../app/catalogo'),
    });

    await fireEvent.press(screen.getByRole('link', { name: textos.catalogo.abrir }));

    expect(await screen.findByText('Supino Reto')).toBeTruthy();
    expect(screen.getByText(textos.catalogo.titulo)).toBeTruthy();
  });

  it('a rota /catalogo abre a tela com os exercícios da seção 18.4', async () => {
    await renderRouter(
      { index: require('../../app/index'), catalogo: require('../../app/catalogo') },
      { initialUrl: '/catalogo' },
    );

    expect(await screen.findByText('Remada Curvada')).toBeTruthy();
  });
});
