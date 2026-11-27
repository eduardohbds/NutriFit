import { fireEvent, screen } from '@testing-library/react-native';
import { renderRouter } from 'expo-router/testing-library';

import { IniciarSessao } from '../../src/aplicacao/casos-de-uso/iniciar-sessao';
import { LerSessaoEmAndamento } from '../../src/aplicacao/casos-de-uso/ler-sessao-em-andamento';
import { TelaDaSessao } from '../../src/interface/telas/tela-da-sessao';
import { TelaInicial } from '../../src/interface/telas/tela-inicial';
import { textos } from '../../src/interface/textos';
import { QUARTA, SABADO, inicioParaTela, type InicioParaTela } from '../apoio/inicio-de-tela';
import { LimiteDeErro } from '../apoio/limite-de-erro-de-tela';
import { RelogioFixo } from '../dubles/relogio-fixo';

const t = textos.fichas;
const i = textos.inicio;
const s = textos.sessao;

function iniciarSessaoDe(inicio: InicioParaTela, hoje = QUARTA) {
  return new IniciarSessao(inicio.fichas, inicio.sessoes, new RelogioFixo(hoje), inicio.gerador);
}

async function abrirInicio(inicio: InicioParaTela, iniciarSessao: IniciarSessao | undefined) {
  const ler = new LerSessaoEmAndamento(inicio.sessoes, inicio.fichas, inicio.catalogo);
  await renderRouter({
    index: () => (
      <LimiteDeErro>
        <TelaInicial
          escolherTreinoDoDia={inicio.escolherTreinoDoDia}
          lerFichaParaEdicao={inicio.lerFichaParaEdicao}
          iniciarSessao={iniciarSessao}
        />
      </LimiteDeErro>
    ),
    sessao: () => (
      <LimiteDeErro>
        <TelaDaSessao lerSessaoEmAndamento={ler} />
      </LimiteDeErro>
    ),
  });
}

const botaoIniciar = () => screen.queryByRole('button', { name: i.iniciarTreino });

async function ativada(hoje = QUARTA) {
  const inicio = await inicioParaTela(hoje);
  await inicio.ativarFicha.executar(inicio.fichaDaDt01);
  return inicio;
}

async function rotinaDe(inicio: InicioParaTela, dia: string) {
  const versao = (await inicio.fichas.buscarVersaoAtual(inicio.fichaDaDt01))!;
  return versao.rotinas.find((r) => r.nome === dia)!;
}

describe('botão Iniciar treino na tela inicial (US-013d1, RF01)', () => {
  it('com o caso de uso e a rotina de hoje mostrada, o botão aparece', async () => {
    const inicio = await ativada();

    await abrirInicio(inicio, iniciarSessaoDe(inicio));

    await screen.findByText(i.sugerido);
    expect(botaoIniciar()).toBeTruthy();
  });

  it('sem o caso de uso a tela fica só de leitura, sem o botão', async () => {
    const inicio = await ativada();

    await abrirInicio(inicio, undefined);

    await screen.findByText(i.sugerido);
    expect(botaoIniciar()).toBeNull();
  });

  it('tocar abre a tela da sessão com a rotina e os exercícios, e a sessão fica gravada', async () => {
    const inicio = await ativada();
    await abrirInicio(inicio, iniciarSessaoDe(inicio));
    await screen.findByText(i.sugerido);

    await fireEvent.press(screen.getByRole('button', { name: i.iniciarTreino }));

    expect(await screen.findByText(s.titulo)).toBeTruthy();
    expect(screen.getByText(s.rotina('Quarta'))).toBeTruthy();
    expect(screen.getByText(t.exercicio(1, 'Desenvolvimento com Barra'))).toBeTruthy();
    const gravada = await inicio.sessoes.buscarSessaoEmAndamento();
    expect(gravada?.rotinaId?.valor).toBe((await rotinaDe(inicio, 'Quarta')).id.valor);
    expect(gravada?.exercicios).toHaveLength(6);
  });

  it('escolhida outra rotina, a sessão iniciada é a dela', async () => {
    const inicio = await ativada();
    await abrirInicio(inicio, iniciarSessaoDe(inicio));
    await screen.findByText(i.sugerido);
    await fireEvent.press(screen.getByRole('button', { name: i.verRotina('Sexta') }));
    await screen.findByText(i.escolhida);

    await fireEvent.press(screen.getByRole('button', { name: i.iniciarTreino }));

    expect(await screen.findByText(s.rotina('Sexta'))).toBeTruthy();
    expect(screen.getByText(t.exercicio(1, 'Esteira'))).toBeTruthy();
    const gravada = await inicio.sessoes.buscarSessaoEmAndamento();
    expect(gravada?.rotinaId?.valor).toBe((await rotinaDe(inicio, 'Sexta')).id.valor);
  });

  it('num dia sem rotina não há botão até escolher uma rotina (CE01)', async () => {
    const inicio = await ativada(SABADO);
    await abrirInicio(inicio, iniciarSessaoDe(inicio, SABADO));
    await screen.findByText(i.semRotinaHoje('Sábado'));
    expect(botaoIniciar()).toBeNull();

    await fireEvent.press(screen.getByRole('button', { name: i.verRotina('Terça') }));

    expect(await screen.findByRole('button', { name: i.iniciarTreino })).toBeTruthy();
  });

  it('sem ficha ativa não há botão (CE02)', async () => {
    const inicio = await inicioParaTela();

    await abrirInicio(inicio, iniciarSessaoDe(inicio));

    await screen.findByText(i.semFichaAtiva);
    expect(botaoIniciar()).toBeNull();
  });
});

describe('sessão já em andamento (US-013d1, CE03)', () => {
  it('avisa e oferece abrir o treino em andamento, sem criar outra sessão', async () => {
    const inicio = await ativada();
    const quarta = await rotinaDe(inicio, 'Quarta');
    const primeira = await iniciarSessaoDe(inicio).executar(quarta.id);
    if (!primeira.iniciada) throw new Error('esperava sessão iniciada');
    await abrirInicio(inicio, iniciarSessaoDe(inicio));
    await screen.findByText(i.sugerido);

    await fireEvent.press(screen.getByRole('button', { name: i.iniciarTreino }));

    expect(await screen.findByText(i.jaEmAndamento)).toBeTruthy();
    expect(screen.queryByText(s.titulo)).toBeNull();
    const emAndamento = await inicio.sessoes.buscarSessaoEmAndamento();
    expect(emAndamento?.id.valor).toBe(primeira.sessaoId.valor);
    expect(emAndamento?.exercicios).toHaveLength(6);
  });

  it('o link abre a tela do treino em andamento', async () => {
    const inicio = await ativada();
    const quarta = await rotinaDe(inicio, 'Quarta');
    await iniciarSessaoDe(inicio).executar(quarta.id);
    await abrirInicio(inicio, iniciarSessaoDe(inicio));
    await screen.findByText(i.sugerido);
    await fireEvent.press(screen.getByRole('button', { name: i.iniciarTreino }));
    await screen.findByText(i.jaEmAndamento);

    await fireEvent.press(screen.getByRole('link', { name: i.abrirEmAndamento }));

    expect(await screen.findByText(s.titulo)).toBeTruthy();
    expect(screen.getByText(s.rotina('Quarta'))).toBeTruthy();
  });
});

describe('falha ao iniciar (US-013d1)', () => {
  it('vai ao limite de erro, que registra e avisa', async () => {
    const inicio = await ativada();
    const quebrado = {
      executar: jest.fn().mockRejectedValue(new Error('banco quebrou')),
    } as unknown as IniciarSessao;
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
    await abrirInicio(inicio, quebrado);
    await screen.findByText(i.sugerido);

    await fireEvent.press(screen.getByRole('button', { name: i.iniciarTreino }));

    expect(await screen.findByText('Caiu: banco quebrou')).toBeTruthy();
  });
});
