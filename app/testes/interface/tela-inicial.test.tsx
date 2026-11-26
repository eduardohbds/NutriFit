import { fireEvent, screen } from '@testing-library/react-native';
import { renderRouter } from 'expo-router/testing-library';
import { Component, type ReactNode } from 'react';
import { Text } from 'react-native';

import type { EscolherTreinoDoDia } from '../../src/aplicacao/casos-de-uso/escolher-treino-do-dia';
import { TelaInicial } from '../../src/interface/telas/tela-inicial';
import { textos } from '../../src/interface/textos';
import {
  SABADO,
  ativarRotacao,
  inicioParaTela,
  registrarSessaoConcluida,
  type InicioParaTela,
} from '../apoio/inicio-de-tela';

const t = textos.fichas;
const i = textos.inicio;

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

async function abrirInicio(inicio: InicioParaTela, escolher?: EscolherTreinoDoDia) {
  await renderRouter({
    index: () => (
      <LimiteDeErro>
        <TelaInicial
          escolherTreinoDoDia={escolher ?? inicio.escolherTreinoDoDia}
          lerFichaParaEdicao={inicio.lerFichaParaEdicao}
        />
      </LimiteDeErro>
    ),
    fichas: () => <Text>Tela das fichas</Text>,
    catalogo: () => <Text>Tela do catálogo</Text>,
  });
}

const botao = (nome: string) => screen.queryByRole('button', { name: nome });

async function tocar(nome: string) {
  await fireEvent.press(await screen.findByRole('button', { name: nome }));
}

describe('tela inicial com o treino de hoje (US-012b, RF01)', () => {
  it('numa quarta, com a DT01 ativa, mostra o treino de hoje sem nenhum toque', async () => {
    const inicio = await inicioParaTela();
    await inicio.ativarFicha.executar(inicio.fichaDaDt01);

    await abrirInicio(inicio);

    expect(await screen.findByText(i.titulo)).toBeTruthy();
    expect(await screen.findByText(i.fichaAtiva('Ficha de referência (DT01)'))).toBeTruthy();
    expect(screen.getByText(i.sugerido)).toBeTruthy();
    expect(screen.getByText(t.diaDaSemana('Quarta'))).toBeTruthy();
    expect(screen.getByText(t.exercicio(1, 'Desenvolvimento com Barra'))).toBeTruthy();
    expect(screen.getByText(t.exercicio(6, 'Rosca de Punho Inversa'))).toBeTruthy();
    expect(screen.getAllByText(/^\d+\. /)).toHaveLength(6);
    expect(screen.queryByText(t.exercicio(1, 'Supino Reto'))).toBeNull();
  });

  it('mostra o planejado de cada exercício: séries e meta', async () => {
    const inicio = await inicioParaTela();
    await inicio.ativarFicha.executar(inicio.fichaDaDt01);

    await abrirInicio(inicio);

    await screen.findByText(t.exercicio(1, 'Desenvolvimento com Barra'));
    expect(screen.getAllByText(/^4 séries · Meta: 10$/)).toHaveLength(1);
    expect(screen.getAllByText(/^3 séries · Meta: 15$/).length).toBeGreaterThan(0);
  });

  it('lista as rotinas da ficha para ver outra, com a sugerida entre elas', async () => {
    const inicio = await inicioParaTela();
    await inicio.ativarFicha.executar(inicio.fichaDaDt01);

    await abrirInicio(inicio);

    await screen.findByText(i.sugerido);
    expect(screen.getByText(i.escolherOutra)).toBeTruthy();
    for (const dia of ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta']) {
      expect(botao(i.verRotina(dia))).toBeTruthy();
    }
  });
});

describe('escolher outra rotina (US-012b)', () => {
  it('a tela passa a mostrar a rotina escolhida, marcada como escolhida', async () => {
    const inicio = await inicioParaTela();
    await inicio.ativarFicha.executar(inicio.fichaDaDt01);
    await abrirInicio(inicio);
    await screen.findByText(i.sugerido);

    await tocar(i.verRotina('Sexta'));

    expect(await screen.findByText(t.exercicio(1, 'Esteira'))).toBeTruthy();
    expect(screen.getByText(i.escolhida)).toBeTruthy();
    expect(screen.queryByText(i.sugerido)).toBeNull();
    expect(screen.getByText(t.diaDaSemana('Sexta'))).toBeTruthy();
    expect(screen.queryByText(t.exercicio(1, 'Desenvolvimento com Barra'))).toBeNull();
  });

  it('voltar para a sugerida mostra de novo o treino de hoje', async () => {
    const inicio = await inicioParaTela();
    await inicio.ativarFicha.executar(inicio.fichaDaDt01);
    await abrirInicio(inicio);
    await tocar(i.verRotina('Sexta'));
    await screen.findByText(i.escolhida);

    await tocar(i.verRotina('Quarta'));

    expect(await screen.findByText(i.sugerido)).toBeTruthy();
    expect(screen.getByText(t.exercicio(1, 'Desenvolvimento com Barra'))).toBeTruthy();
  });

  it('nenhuma versão da ficha é criada ao escolher outra rotina', async () => {
    const inicio = await inicioParaTela();
    await inicio.ativarFicha.executar(inicio.fichaDaDt01);
    const versoesAntes = await inicio.fichas.listarVersoes(inicio.fichaDaDt01);
    const fichasAntes = await inicio.fichas.listarFichas();
    await abrirInicio(inicio);
    await screen.findByText(i.sugerido);

    await tocar(i.verRotina('Segunda'));
    await tocar(i.verRotina('Terça'));
    await screen.findByText(i.escolhida);

    expect(await inicio.fichas.listarVersoes(inicio.fichaDaDt01)).toEqual(versoesAntes);
    expect(await inicio.fichas.listarFichas()).toEqual(fichasAntes);
  });
});

describe('ficha por rotação na tela inicial (US-012b)', () => {
  it('sem nenhuma sessão concluída mostra Treino A', async () => {
    const semSessao = await inicioParaTela();
    await ativarRotacao(semSessao);
    await abrirInicio(semSessao);
    expect(await screen.findByText('Treino A')).toBeTruthy();
    expect(screen.getByText(i.sugerido)).toBeTruthy();
  });

  it('depois da sessão concluída em Treino B, sugere Treino C', async () => {
    const inicio = await inicioParaTela();
    const fichaId = await ativarRotacao(inicio);
    await registrarSessaoConcluida(inicio, fichaId, 'Treino B');

    await abrirInicio(inicio);

    expect(await screen.findByText(i.fichaAtiva('Rotação ABC'))).toBeTruthy();
    expect(await screen.findByText('Treino C')).toBeTruthy();
    expect(screen.queryByText(t.diaDaSemana('Quarta'))).toBeNull();
  });
});

describe('dia sem rotina na tela inicial (US-012b, CE01)', () => {
  it('num sábado mostra o aviso e lista as rotinas, sem escolher nenhuma por conta própria', async () => {
    const inicio = await inicioParaTela(SABADO);
    await inicio.ativarFicha.executar(inicio.fichaDaDt01);

    await abrirInicio(inicio);

    expect(await screen.findByText(i.semRotinaHoje('Sábado'))).toBeTruthy();
    for (const dia of ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta']) {
      expect(botao(i.verRotina(dia))).toBeTruthy();
    }
    expect(screen.queryByText(i.sugerido)).toBeNull();
    expect(screen.queryAllByText(/^\d+\. /)).toHaveLength(0);
  });

  it('escolher uma rotina mostra os exercícios dela, marcada como escolhida', async () => {
    const inicio = await inicioParaTela(SABADO);
    await inicio.ativarFicha.executar(inicio.fichaDaDt01);
    await abrirInicio(inicio);
    await screen.findByText(i.semRotinaHoje('Sábado'));

    await tocar(i.verRotina('Terça'));

    expect(await screen.findByText(t.exercicio(1, 'Barra Fixa'))).toBeTruthy();
    expect(screen.getByText(i.escolhida)).toBeTruthy();
  });
});

describe('sem ficha ativa na tela inicial (US-012b, CE02, SL18)', () => {
  it('avisa e oferece criar ficha, que leva às fichas', async () => {
    const inicio = await inicioParaTela();

    await abrirInicio(inicio);

    expect(await screen.findByText(i.semFichaAtiva)).toBeTruthy();
    await fireEvent.press(screen.getByRole('link', { name: i.criarFicha }));
    expect(await screen.findByText('Tela das fichas')).toBeTruthy();
  });

  it('importar, pedir à IA e treino livre aparecem, mas desativados, até as histórias deles', async () => {
    const inicio = await inicioParaTela();

    await abrirInicio(inicio);

    await screen.findByText(i.semFichaAtiva);
    for (const nome of [i.importarFicha, i.pedirParaIa, i.treinoLivre]) {
      const opcao = screen.getByRole('button', { name: nome });
      expect(opcao.props.accessibilityState?.disabled).toBe(true);
    }
    expect(screen.getAllByText(i.emBreve)).toHaveLength(3);
  });

  it('só com fichas inativas ou arquivadas também mostra as opções', async () => {
    const inicio = await inicioParaTela();
    await inicio.ativarFicha.executar(inicio.fichaDaDt01);
    await inicio.arquivarFicha.executar(inicio.fichaDaDt01);

    await abrirInicio(inicio);

    expect(await screen.findByText(i.semFichaAtiva)).toBeTruthy();
  });
});

describe('navegação e falhas da tela inicial (US-012b)', () => {
  it('os links para o catálogo e para as fichas continuam na tela', async () => {
    const inicio = await inicioParaTela();
    await inicio.ativarFicha.executar(inicio.fichaDaDt01);

    await abrirInicio(inicio);

    await screen.findByText(i.sugerido);
    expect(screen.getByRole('link', { name: textos.catalogo.abrir })).toBeTruthy();
    expect(screen.getByRole('link', { name: t.abrir })).toBeTruthy();
  });

  it('a falha ao escolher o treino vai para o limite de erro, que registra e avisa', async () => {
    const inicio = await inicioParaTela();
    const quebrado = {
      executar: jest.fn().mockRejectedValue(new Error('banco quebrou')),
    } as unknown as EscolherTreinoDoDia;
    jest.spyOn(console, 'error').mockImplementation(() => undefined);

    await abrirInicio(inicio, quebrado);

    expect(await screen.findByText('Caiu: banco quebrou')).toBeTruthy();
  });
});
