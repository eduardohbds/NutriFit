import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { renderRouter } from 'expo-router/testing-library';
import { Text } from 'react-native';

import { ConcluirSerieDaSessao } from '../../src/aplicacao/casos-de-uso/concluir-serie-da-sessao';
import { HistoricoDoExercicio } from '../../src/aplicacao/casos-de-uso/historico-do-exercicio';
import { IniciarSessao } from '../../src/aplicacao/casos-de-uso/iniciar-sessao';
import { LerSessaoEmAndamento } from '../../src/aplicacao/casos-de-uso/ler-sessao-em-andamento';
import { PrepararSerie } from '../../src/aplicacao/casos-de-uso/preparar-serie';
import { RegistrarFalha } from '../../src/aplicacao/casos-de-uso/registrar-falha';
import { RegistrarSerie } from '../../src/aplicacao/casos-de-uso/registrar-serie';
import type { PedidoDeFicha } from '../../src/aplicacao/casos-de-uso/salvar-ficha';
import { InstanteUtc } from '../../src/dominio/instante-utc';
import { TelaDaSessao } from '../../src/interface/telas/tela-da-sessao';
import { textos } from '../../src/interface/textos';
import { QUARTA, inicioParaTela, type InicioParaTela } from '../apoio/inicio-de-tela';
import { LimiteDeErro } from '../apoio/limite-de-erro-de-tela';
import { FabricaDeSessoes } from '../apoio/sessao-de-exemplo';
import { RegistroDeFalhasEmMemoria } from '../dubles/registro-de-falhas-em-memoria';
import { RelogioFixo } from '../dubles/relogio-fixo';
import { RepositorioDeSessoesSemEspaco } from '../dubles/repositorio-de-sessoes-sem-espaco';

const s = textos.sessao;
const DESENVOLVIMENTO = 'Desenvolvimento com Barra';

async function montar(inicio: InicioParaTela, dia = 'Quarta') {
  await inicio.ativarFicha.executar(inicio.fichaDaDt01);
  const sessoes = new RepositorioDeSessoesSemEspaco();
  const relogio = new RelogioFixo(QUARTA);
  const versao = (await inicio.fichas.buscarVersaoAtual(inicio.fichaDaDt01))!;
  const rotina = versao.rotinas.find((r) => r.nome === dia)!;
  await new IniciarSessao(inicio.fichas, sessoes, relogio, inicio.gerador).executar(rotina.id);
  return { sessoes, ...aTela(inicio, sessoes, relogio) };
}

function aTela(
  inicio: InicioParaTela,
  sessoes: RepositorioDeSessoesSemEspaco,
  relogio: RelogioFixo,
) {
  const registrar = new RegistrarSerie(
    sessoes,
    new RegistrarFalha(new RegistroDeFalhasEmMemoria(), relogio, '0.0.1'),
  );
  return {
    ler: new LerSessaoEmAndamento(sessoes, inicio.fichas, inicio.catalogo),
    preparar: new PrepararSerie(new HistoricoDoExercicio(inicio.catalogo, sessoes)),
    concluir: new ConcluirSerieDaSessao(registrar, relogio, inicio.gerador),
  };
}

async function abrir(tela: ReturnType<typeof aTela>) {
  await renderRouter(
    {
      index: () => <Text>Início</Text>,
      sessao: () => (
        <LimiteDeErro>
          <TelaDaSessao
            lerSessaoEmAndamento={tela.ler}
            prepararSerie={tela.preparar}
            concluirSerie={tela.concluir}
          />
        </LimiteDeErro>
      ),
    },
    { initialUrl: '/sessao' },
  );
  await screen.findByText(s.titulo);
}

const campo = (rotulo: string) => screen.getByLabelText(rotulo);
const digitar = (rotulo: string, texto: string) => fireEvent.changeText(campo(rotulo), texto);
const concluir = (nome: string) =>
  fireEvent.press(screen.getByRole('button', { name: s.concluirSerie(nome) }));

async function seriesDoPrimeiro(sessoes: RepositorioDeSessoesSemEspaco) {
  const sessao = (await sessoes.buscarSessaoEmAndamento())!;
  return sessao.exercicios[0].series;
}

describe('registrar a série na tela da sessão (US-013d2, RF02, FI-1)', () => {
  it('o formulário vem preenchido pela ficha quando não há histórico, com o RIR vazio', async () => {
    const { ler, preparar, concluir: caso } = await montar(await inicioParaTela());

    await abrir({ ler, preparar, concluir: caso });

    expect(campo(s.campoRepeticoes(DESENVOLVIMENTO)).props.value).toBe('10');
    expect(campo(s.campoCarga(DESENVOLVIMENTO)).props.value).toBe('');
    expect(campo(s.campoRir(DESENVOLVIMENTO)).props.value).toBe('');
  });

  it('vem preenchido pela última sessão do exercício: carga e repetições, nunca o RIR', async () => {
    const inicio = await inicioParaTela();
    const tela = await montar(inicio);
    const fabrica = new FabricaDeSessoes(inicio.ids.get(DESENVOLVIMENTO)!);
    const anterior = fabrica.sessao({ fichaId: null, versaoId: null, rotinaId: null });
    const exercicio = fabrica.exercicio();
    await tela.sessoes.iniciarSessaoComExercicios(
      { ...anterior, inicio: InstanteUtc.de('2026-11-04T12:00:00.000Z'), situacao: 'concluida' },
      [exercicio],
    );
    await tela.sessoes.registrarSerie(
      exercicio.id,
      fabrica.serie({ cargaEmQuilos: 50, repeticoes: 8, rir: 2 }),
    );

    await abrir(tela);

    expect(campo(s.campoCarga(DESENVOLVIMENTO)).props.value).toBe('50');
    expect(campo(s.campoRepeticoes(DESENVOLVIMENTO)).props.value).toBe('8');
    expect(campo(s.campoRir(DESENVOLVIMENTO)).props.value).toBe('');
  });

  it('concluir grava a série e ela aparece na lista do exercício', async () => {
    const tela = await montar(await inicioParaTela());
    await abrir(tela);

    await digitar(s.campoCarga(DESENVOLVIMENTO), '40');
    await digitar(s.campoRir(DESENVOLVIMENTO), '2');
    await concluir(DESENVOLVIMENTO);

    expect(await screen.findByText('Série 1: 40 kg × 10, RIR 2')).toBeTruthy();
    const [serie] = await seriesDoPrimeiro(tela.sessoes);
    expect(serie).toMatchObject({ repeticoes: 10, rir: 2 });
    expect(serie.carga?.gramas).toBe(40000);
  });

  it('sem RIR a conclusão é bloqueada, nada é gravado e o campo é destacado (RB09)', async () => {
    const tela = await montar(await inicioParaTela());
    await abrir(tela);

    await concluir(DESENVOLVIMENTO);

    expect(
      await screen.findByText(s.erroDoCampo('rir', '(vazio)', 'inteiro de 0 a 5')),
    ).toBeTruthy();
    expect(campo(s.campoRir(DESENVOLVIMENTO)).props['aria-invalid']).toBe(true);
    expect(campo(s.campoRepeticoes(DESENVOLVIMENTO)).props['aria-invalid']).not.toBe(true);
    expect(await seriesDoPrimeiro(tela.sessoes)).toEqual([]);
  });

  it('valor inválido diz o valor recebido e o formato esperado, destaca o campo e mantém o digitado', async () => {
    const tela = await montar(await inicioParaTela());
    await abrir(tela);
    await digitar(s.campoRir(DESENVOLVIMENTO), '2');
    await digitar(s.campoRepeticoes(DESENVOLVIMENTO), 'abc');

    await concluir(DESENVOLVIMENTO);

    const aviso = s.erroDoCampo('repetições', 'abc', 'inteiro maior ou igual a 1');
    expect(await screen.findByText(aviso)).toBeTruthy();
    expect(campo(s.campoRepeticoes(DESENVOLVIMENTO)).props['aria-invalid']).toBe(true);
    expect(campo(s.campoRepeticoes(DESENVOLVIMENTO)).props.value).toBe('abc');
    expect(await seriesDoPrimeiro(tela.sessoes)).toEqual([]);
  });

  it('corrigido o campo, concluir grava e o aviso some', async () => {
    const tela = await montar(await inicioParaTela());
    await abrir(tela);
    await digitar(s.campoRir(DESENVOLVIMENTO), '9');
    await concluir(DESENVOLVIMENTO);
    await screen.findByText(s.erroDoCampo('rir', '9', 'inteiro de 0 a 5'));

    await digitar(s.campoRir(DESENVOLVIMENTO), '3');
    await concluir(DESENVOLVIMENTO);

    expect(await screen.findByText(/^Série 1: .*RIR 3$/)).toBeTruthy();
    expect(screen.queryByText(/Valor recebido/)).toBeNull();
    expect(await seriesDoPrimeiro(tela.sessoes)).toHaveLength(1);
  });

  it('sem espaço no aparelho avisa, mantém o digitado e grava ao tentar de novo (CE61)', async () => {
    const tela = await montar(await inicioParaTela());
    await abrir(tela);
    await digitar(s.campoCarga(DESENVOLVIMENTO), '40');
    await digitar(s.campoRir(DESENVOLVIMENTO), '2');
    tela.sessoes.cheio = true;

    await concluir(DESENVOLVIMENTO);

    expect(await screen.findByText(s.semEspaco)).toBeTruthy();
    expect(campo(s.campoCarga(DESENVOLVIMENTO)).props.value).toBe('40');
    expect(await seriesDoPrimeiro(tela.sessoes)).toEqual([]);

    tela.sessoes.cheio = false;
    await concluir(DESENVOLVIMENTO);
    await waitFor(async () => expect(await seriesDoPrimeiro(tela.sessoes)).toHaveLength(1));
    expect(await screen.findByText('Série 1: 40 kg × 10, RIR 2')).toBeTruthy();
    expect(screen.queryByText(s.semEspaco)).toBeNull();
  });

  it('uma falha inesperada ao gravar vai ao limite de erro', async () => {
    const tela = await montar(await inicioParaTela());
    await abrir(tela);
    await digitar(s.campoRir(DESENVOLVIMENTO), '2');
    tela.sessoes.falhaInesperada = new Error('disco quebrou');

    await concluir(DESENVOLVIMENTO);

    expect(await screen.findByText('Caiu: disco quebrou')).toBeTruthy();
  });

  it('só o exercício unilateral tem o campo do outro lado, e a série guarda os dois lados (RB19)', async () => {
    const inicio = await inicioParaTela();
    const supino = inicio.ids.get('Supino Reto')!;
    const lateral = inicio.ids.get('Elevação Lateral')!;
    const item = (ordem: number, exercicioId: typeof supino, unilateral: boolean) => ({
      ordem,
      exercicioId,
      grupo: null,
      unilateral,
      observacoes: null,
      listas: { quantidade: 3, meta: '10', carga: null, tecnica: null, descanso: null },
    });
    const pedido: PedidoDeFicha = {
      nome: 'Unilateral',
      rotinas: [
        {
          nome: 'Treino A',
          diaDaSemana: null,
          itens: [item(1, supino, true), item(2, lateral, false)],
        },
      ],
    };
    const { fichaId } = await inicio.salvarFicha.executar(pedido);
    await inicio.ativarFicha.executar(fichaId);
    const sessoes = new RepositorioDeSessoesSemEspaco();
    const relogio = new RelogioFixo(QUARTA);
    const rotina = (await inicio.fichas.buscarVersaoAtual(fichaId))!.rotinas[0];
    await new IniciarSessao(inicio.fichas, sessoes, relogio, inicio.gerador).executar(rotina.id);
    await abrir(aTela(inicio, sessoes, relogio));

    expect(screen.queryByLabelText(s.campoRepeticoesOutroLado('Elevação Lateral'))).toBeNull();
    await digitar(s.campoRir('Supino Reto'), '1');
    await digitar(s.campoRepeticoesOutroLado('Supino Reto'), '8');
    await concluir('Supino Reto');

    await screen.findByText(/^Série 1: /);
    const [serie] = await seriesDoPrimeiro(sessoes);
    expect(serie).toMatchObject({ repeticoes: 10, repeticoesOutroLado: 8 });
  });
});
