import { fireEvent, screen } from '@testing-library/react-native';
import { renderRouter } from 'expo-router/testing-library';
import { Text } from 'react-native';

import { IniciarSessao } from '../../src/aplicacao/casos-de-uso/iniciar-sessao';
import { LerSessaoEmAndamento } from '../../src/aplicacao/casos-de-uso/ler-sessao-em-andamento';
import { InstanteUtc } from '../../src/dominio/instante-utc';
import { TelaDaSessao } from '../../src/interface/telas/tela-da-sessao';
import { textos } from '../../src/interface/textos';
import { NOME_DA_FICHA_DT01, pedidoDaDt01 } from '../apoio/fichas-de-tela';
import { QUARTA, inicioParaTela, type InicioParaTela } from '../apoio/inicio-de-tela';
import { LimiteDeErro } from '../apoio/limite-de-erro-de-tela';
import { RelogioFixo } from '../dubles/relogio-fixo';

const t = textos.fichas;
const s = textos.sessao;

async function abrirSessao(inicio: InicioParaTela, ler?: LerSessaoEmAndamento) {
  const lerDaSessao =
    ler ?? new LerSessaoEmAndamento(inicio.sessoes, inicio.fichas, inicio.catalogo);
  await renderRouter(
    {
      index: () => <Text>Início</Text>,
      sessao: () => (
        <LimiteDeErro>
          <TelaDaSessao lerSessaoEmAndamento={lerDaSessao} />
        </LimiteDeErro>
      ),
    },
    { initialUrl: '/sessao' },
  );
}

async function iniciarTreino(inicio: InicioParaTela, dia: string) {
  const versao = (await inicio.fichas.buscarVersaoAtual(inicio.fichaDaDt01))!;
  const rotina = versao.rotinas.find((r) => r.nome === dia)!;
  const caso = new IniciarSessao(
    inicio.fichas,
    inicio.sessoes,
    new RelogioFixo(QUARTA),
    inicio.gerador,
  );
  await caso.executar(rotina.id);
}

describe('tela da sessão em andamento (US-013d1, RF01)', () => {
  it('mostra o título, a ficha, a rotina, o início e os exercícios na ordem, com o planejado', async () => {
    const inicio = await inicioParaTela();
    await inicio.ativarFicha.executar(inicio.fichaDaDt01);
    await iniciarTreino(inicio, 'Quarta');

    await abrirSessao(inicio);

    expect(await screen.findByText(s.titulo)).toBeTruthy();
    expect(screen.getByText(s.ficha(NOME_DA_FICHA_DT01))).toBeTruthy();
    expect(screen.getByText(s.rotina('Quarta'))).toBeTruthy();
    expect(screen.getByText(/^Iniciado em \d{2}\/\d{2}\/\d{4} \d{2}:\d{2}$/)).toBeTruthy();
    expect(screen.getAllByText(/^\d+\. /)).toHaveLength(6);
    expect(screen.getByText(t.exercicio(1, 'Desenvolvimento com Barra'))).toBeTruthy();
    expect(screen.getByText(t.exercicio(6, 'Rosca de Punho Inversa'))).toBeTruthy();
    const resumo = t.resumoDaLinha({
      quantidade: 4,
      meta: '10',
      carga: null,
      tecnica: null,
      descanso: null,
    });
    expect(screen.getAllByText(resumo).length).toBeGreaterThan(0);
  });

  it('mostra o planejado da versão da época, mesmo com a ficha editada depois (CE05)', async () => {
    const inicio = await inicioParaTela();
    await inicio.ativarFicha.executar(inicio.fichaDaDt01);
    await iniciarTreino(inicio, 'Quarta');
    const pedido = pedidoDaDt01(inicio.ids);
    const primeiro = pedido.rotinas[2].itens[0];
    pedido.rotinas[2].itens[0] = { ...primeiro, listas: { ...primeiro.listas!, meta: '15' } };
    await inicio.salvarFicha.executar({ ...pedido, fichaId: inicio.fichaDaDt01, motivo: 'ajuste' });

    await abrirSessao(inicio);

    await screen.findByText(s.titulo);
    expect(screen.getAllByText(/Meta: 10$/).length).toBeGreaterThan(0);
    expect(screen.queryByText(/Meta: 15$/)).toBeNull();
  });

  it('sem sessão em andamento avisa e volta ao início', async () => {
    const inicio = await inicioParaTela();

    await abrirSessao(inicio);

    expect(await screen.findByText(s.nenhuma)).toBeTruthy();
    expect(screen.queryByText(s.titulo)).toBeNull();
    await fireEvent.press(screen.getByRole('link', { name: s.voltarAoInicio }));
    expect(await screen.findByText('Início')).toBeTruthy();
  });

  it('treino livre mostra "Treino livre", sem ficha nem rotina', async () => {
    const inicio = await inicioParaTela();
    await inicio.sessoes.iniciarSessaoComExercicios(
      {
        id: inicio.gerador.gerar(),
        inicio: InstanteUtc.de(QUARTA),
        fim: null,
        fichaId: null,
        versaoId: null,
        rotinaId: null,
        situacao: 'em_andamento',
        observacao: null,
      },
      [
        {
          id: inicio.gerador.gerar(),
          exercicioId: inicio.ids.get('Supino Reto')!,
          itemOrigemId: null,
          observacoes: null,
        },
      ],
    );

    await abrirSessao(inicio);

    expect(await screen.findByText(s.treinoLivre)).toBeTruthy();
    expect(screen.getByText(t.exercicio(1, 'Supino Reto'))).toBeTruthy();
    expect(screen.queryByText(/^Ficha: /)).toBeNull();
    expect(screen.queryByText(/^Rotina: /)).toBeNull();
  });

  it('a falha ao ler vai ao limite de erro, que registra e avisa', async () => {
    const inicio = await inicioParaTela();
    const quebrado = {
      executar: jest.fn().mockRejectedValue(new Error('banco quebrou')),
    } as unknown as LerSessaoEmAndamento;
    jest.spyOn(console, 'error').mockImplementation(() => undefined);

    await abrirSessao(inicio, quebrado);

    expect(await screen.findByText('Caiu: banco quebrou')).toBeTruthy();
  });

  it('só lê: a sessão fica como estava', async () => {
    const inicio = await inicioParaTela();
    await inicio.ativarFicha.executar(inicio.fichaDaDt01);
    await iniciarTreino(inicio, 'Quarta');
    const antes = await inicio.sessoes.buscarSessaoEmAndamento();

    await abrirSessao(inicio);
    await screen.findByText(s.titulo);

    expect(await inicio.sessoes.buscarSessaoEmAndamento()).toEqual(antes);
  });
});
