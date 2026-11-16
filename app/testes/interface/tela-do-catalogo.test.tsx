import { fireEvent, render, screen } from '@testing-library/react-native';

import { TelaDoCatalogo } from '../../src/interface/telas/tela-do-catalogo';
import { textos } from '../../src/interface/textos';
import { catalogoInicialParaTela } from '../apoio/catalogo-de-tela';
import { CATALOGO_INICIAL } from '../casos-de-referencia/catalogo-inicial';

const GRUPOS = [
  'Peitoral',
  'Costas',
  'Trapézio',
  'Ombro anterior',
  'Ombro lateral',
  'Ombro posterior',
  'Bíceps',
  'Tríceps',
  'Antebraço',
  'Abdômen',
  'Lombar',
  'Quadríceps',
  'Posterior de coxa',
  'Glúteos',
  'Adutores',
  'Panturrilha',
];

async function abrir() {
  const catalogo = catalogoInicialParaTela();
  await render(
    <TelaDoCatalogo
      listarExercicios={catalogo.listarExercicios}
      editarGrupos={catalogo.editarGrupos}
    />,
  );
  return catalogo;
}

async function abrirEdicaoDe(nome: string) {
  await abrir();
  await fireEvent.press(
    await screen.findByRole('button', { name: textos.catalogo.editarGrupos(nome) }),
  );
}

describe('tela do catálogo (US-004c)', () => {
  it('no primeiro uso, o catálogo mostra os exercícios da seção 18.4 com grupos diretos e indiretos', async () => {
    await abrir();

    for (const e of CATALOGO_INICIAL) expect(await screen.findByText(e.nome)).toBeTruthy();
    expect(screen.getByText(textos.catalogo.diretos(['Peitoral', 'Tríceps']))).toBeTruthy();
    expect(
      screen.getAllByText(textos.catalogo.indiretos(['Ombro anterior', 'Tríceps'])).length,
    ).toBeGreaterThan(0);
  });

  it('exercício sem grupos mostra que fica fora da contagem', async () => {
    await abrir();

    await screen.findByText('Corrida');
    expect(screen.getAllByText(textos.catalogo.semGrupos).length).toBeGreaterThanOrEqual(2);
  });

  it('a edição oferece só os 16 grupos fixos, cada um como direto ou indireto', async () => {
    await abrirEdicaoDe('Corrida');

    const diretos = await screen.findAllByRole('button', { name: /: direto$/ });
    const indiretos = screen.getAllByRole('button', { name: /: indireto$/ });
    expect(diretos).toHaveLength(16);
    expect(indiretos).toHaveLength(16);
    for (const grupo of GRUPOS) {
      expect(
        screen.getByRole('button', { name: textos.catalogo.marcarDireto(grupo) }),
      ).toBeTruthy();
    }
  });

  it('um grupo escolhido como direto não pode ser marcado também como indireto, e vice-versa', async () => {
    await abrirEdicaoDe('Corrida');

    await fireEvent.press(
      await screen.findByRole('button', { name: textos.catalogo.marcarDireto('Peitoral') }),
    );
    await fireEvent.press(
      screen.getByRole('button', { name: textos.catalogo.marcarIndireto('Tríceps') }),
    );

    expect(
      screen.getByRole('button', {
        name: textos.catalogo.marcarIndireto('Peitoral'),
        disabled: true,
      }),
    ).toBeTruthy();
    expect(
      screen.getByRole('button', { name: textos.catalogo.marcarDireto('Tríceps'), disabled: true }),
    ).toBeTruthy();
  });

  it('salvar grava os grupos escolhidos e a lista passa a mostrá-los', async () => {
    await abrirEdicaoDe('Corrida');

    // Quadríceps e Panturrilha juntos: nenhum outro exercício do catálogo tem essa combinação.
    await fireEvent.press(
      await screen.findByRole('button', { name: textos.catalogo.marcarDireto('Quadríceps') }),
    );
    await fireEvent.press(
      screen.getByRole('button', { name: textos.catalogo.marcarDireto('Panturrilha') }),
    );
    await fireEvent.press(screen.getByRole('button', { name: textos.catalogo.salvar }));

    expect(
      await screen.findByText(textos.catalogo.diretos(['Panturrilha', 'Quadríceps'])),
    ).toBeTruthy();
  });

  it('salvamento bloqueado pela regra mostra o valor recebido e o formato esperado, dos textos', async () => {
    await abrirEdicaoDe('Corrida');

    await fireEvent.press(
      await screen.findByRole('button', { name: textos.catalogo.marcarIndireto('Tríceps') }),
    );
    await fireEvent.press(screen.getByRole('button', { name: textos.catalogo.salvar }));

    expect(
      await screen.findByText(
        textos.validacao.recusado('Tríceps', 'pelo menos um grupo direto junto dos indiretos'),
      ),
    ).toBeTruthy();
  });

  it('exercício sem grupo pede confirmação antes de salvar e só então grava', async () => {
    await abrirEdicaoDe('Supino Reto');
    for (const grupo of ['Peitoral']) {
      await fireEvent.press(
        await screen.findByRole('button', { name: textos.catalogo.marcarDireto(grupo) }),
      );
    }
    for (const grupo of ['Tríceps', 'Ombro anterior']) {
      await fireEvent.press(
        screen.getByRole('button', { name: textos.catalogo.marcarIndireto(grupo) }),
      );
    }

    await fireEvent.press(screen.getByRole('button', { name: textos.catalogo.salvar }));
    expect(await screen.findByText(textos.catalogo.confirmarSemGrupos)).toBeTruthy();

    await fireEvent.press(screen.getByRole('button', { name: textos.catalogo.salvarSemGrupos }));
    expect(await screen.findAllByText(textos.catalogo.semGrupos)).toBeTruthy();
  });
});
