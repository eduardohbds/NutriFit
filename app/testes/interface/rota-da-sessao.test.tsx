import { screen } from '@testing-library/react-native';
import { renderRouter } from 'expo-router/testing-library';

import { textos } from '../../src/interface/textos';

// A composição liga o SQLite do aparelho, que o Jest não tem; a tela e os casos de uso são reais.
jest.mock('../../src/composicao', () => {
  const { IniciarSessao } = require('../../src/aplicacao/casos-de-uso/iniciar-sessao');
  const {
    LerSessaoEmAndamento,
  } = require('../../src/aplicacao/casos-de-uso/ler-sessao-em-andamento');
  const { QUARTA, inicioParaTela } = require('../apoio/inicio-de-tela');
  const { RelogioFixo } = require('../dubles/relogio-fixo');
  const pronto = (async () => {
    const inicio = await inicioParaTela();
    await inicio.ativarFicha.executar(inicio.fichaDaDt01);
    const versao = await inicio.fichas.buscarVersaoAtual(inicio.fichaDaDt01);
    const quarta = versao.rotinas.find((r: { nome: string }) => r.nome === 'Quarta');
    const iniciar = new IniciarSessao(
      inicio.fichas,
      inicio.sessoes,
      new RelogioFixo(QUARTA),
      inicio.gerador,
    );
    await iniciar.executar(quarta.id);
    return new LerSessaoEmAndamento(inicio.sessoes, inicio.fichas, inicio.catalogo);
  })();
  return {
    casosDaSessao: () => ({
      lerSessaoEmAndamento: { executar: async () => (await pronto).executar() },
    }),
  };
});

describe('rota da sessão (US-013d1)', () => {
  it('a rota /sessao abre a tela com o treino em andamento', async () => {
    await renderRouter({ sessao: require('../../app/sessao') }, { initialUrl: '/sessao' });

    expect(await screen.findByText(textos.sessao.titulo)).toBeTruthy();
    expect(screen.getByText(textos.sessao.rotina('Quarta'))).toBeTruthy();
    expect(screen.getByText(textos.fichas.exercicio(1, 'Desenvolvimento com Barra'))).toBeTruthy();
  });
});
