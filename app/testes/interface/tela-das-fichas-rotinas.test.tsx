import { fireEvent, render, screen } from '@testing-library/react-native';

import { TelaDasFichas } from '../../src/interface/telas/tela-das-fichas';
import { textos } from '../../src/interface/textos';
import {
  NOME_DA_FICHA_COMPLETA,
  NOME_DA_FICHA_DT01,
  fichasParaTela,
} from '../apoio/fichas-de-tela';

const t = textos.fichas;

async function abrirEdicaoDe(nome: string) {
  const pronto = await fichasParaTela();
  await render(
    <TelaDasFichas
      listarFichas={pronto.listarFichas}
      lerFichaParaEdicao={pronto.lerFichaParaEdicao}
      buscarExercicios={pronto.buscarExercicios}
      salvarFicha={pronto.salvarFicha}
    />,
  );
  await fireEvent.press(await screen.findByRole('button', { name: t.abrirFicha(nome) }));
  await fireEvent.press(await screen.findByRole('button', { name: t.editar }));
  return pronto;
}

const botao = (nome: string) => screen.queryByRole('button', { name: nome });
const nomesDasRotinas = () =>
  screen.getAllByLabelText(/^Nome da rotina \d+$/).map((campo) => campo.props.value);

async function tocar(nome: string) {
  await fireEvent.press(await screen.findByRole('button', { name: nome }));
}

describe('botões das rotinas na edição (US-007d3)', () => {
  it('a primeira rotina não sobe, a última não desce, e todas podem ser removidas', async () => {
    await abrirEdicaoDe(NOME_DA_FICHA_DT01);

    expect(botao(t.subirRotina('Segunda'))).toBeNull();
    expect(botao(t.descerRotina('Segunda'))).toBeTruthy();
    expect(botao(t.subirRotina('Sexta'))).toBeTruthy();
    expect(botao(t.descerRotina('Sexta'))).toBeNull();
    for (const dia of ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta']) {
      expect(botao(t.removerRotina(dia))).toBeTruthy();
    }
    expect(botao(t.novaRotina)).toBeTruthy();
  });

  it('o nome de cada rotina é um campo para alterar', async () => {
    await abrirEdicaoDe(NOME_DA_FICHA_DT01);

    expect(nomesDasRotinas()).toEqual(['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta']);
  });
});

describe('incluir uma rotina (US-007d3)', () => {
  it('na ficha por dia, a rotina nova vem vazia com o primeiro dia livre', async () => {
    await abrirEdicaoDe(NOME_DA_FICHA_DT01);

    await tocar(t.novaRotina);

    expect(await screen.findAllByLabelText(/^Nome da rotina \d+$/)).toHaveLength(6);
    expect(nomesDasRotinas()[5]).toBe('Sábado');
    expect(botao(t.adicionarLinha('Sábado'))).toBeTruthy();
    expect(screen.getAllByText(/^\d+\. /)).toHaveLength(30);
  });

  it('na ficha por rotação, a rotina nova leva o próximo rótulo Treino', async () => {
    await abrirEdicaoDe(NOME_DA_FICHA_COMPLETA);

    await tocar(t.novaRotina);

    expect(await screen.findAllByLabelText(/^Nome da rotina \d+$/)).toHaveLength(2);
    expect(nomesDasRotinas()).toEqual(['Treino A', 'Treino B']);
  });

  it('sem nenhum dia livre, a ficha por dia não oferece Nova rotina', async () => {
    await abrirEdicaoDe(NOME_DA_FICHA_DT01);

    await tocar(t.novaRotina);
    await screen.findByDisplayValue('Sábado');
    await tocar(t.novaRotina);
    await screen.findByDisplayValue('Domingo');

    expect(botao(t.novaRotina)).toBeNull();
  });
});

describe('remover, renomear e reordenar rotinas (US-007d3)', () => {
  it('remover tira a rotina com as linhas dela, e as outras continuam', async () => {
    await abrirEdicaoDe(NOME_DA_FICHA_DT01);

    await tocar(t.removerRotina('Terça'));

    expect(nomesDasRotinas()).toEqual(['Segunda', 'Quarta', 'Quinta', 'Sexta']);
    expect(screen.getAllByText(/^\d+\. /)).toHaveLength(24);
  });

  it('renomear troca o nome, e os campos das linhas passam a usar o nome novo', async () => {
    await abrirEdicaoDe(NOME_DA_FICHA_DT01);

    await fireEvent.changeText(screen.getByLabelText(t.nomeDaRotina(1)), 'Peito');

    expect(screen.getByLabelText(t.nomeDaRotina(1)).props.value).toBe('Peito');
    expect(screen.getByLabelText(t.rotuloDoCampo(t.campo.meta, 'Peito', 1))).toBeTruthy();
    expect(botao(t.adicionarLinha('Peito'))).toBeTruthy();
  });

  it('descer e subir trocam a rotina com a vizinha', async () => {
    await abrirEdicaoDe(NOME_DA_FICHA_DT01);

    await tocar(t.descerRotina('Segunda'));
    expect(nomesDasRotinas().slice(0, 3)).toEqual(['Terça', 'Segunda', 'Quarta']);

    await tocar(t.subirRotina('Quarta'));
    expect(nomesDasRotinas().slice(0, 3)).toEqual(['Terça', 'Quarta', 'Segunda']);
  });

  it('nada é gravado ao mexer nas rotinas, e cancelar descarta tudo', async () => {
    const pronto = await abrirEdicaoDe(NOME_DA_FICHA_DT01);
    await tocar(t.novaRotina);
    await tocar(t.removerRotina('Terça'));
    await tocar(t.descerRotina('Segunda'));

    const versoes = await pronto.fichas.listarVersoes(pronto.fichaDaDt01);
    await tocar(t.cancelarEdicao);

    expect(versoes.map((v) => v.numero)).toEqual([1]);
    expect(await screen.findByText(t.exercicio(1, 'Supino Reto'))).toBeTruthy();
    expect(screen.getByText(t.diaDaSemana('Terça'))).toBeTruthy();
  });
});

describe('salvar com as rotinas mexidas (US-007d3)', () => {
  it('a versão nova traz as rotinas na ordem do rascunho, com a nova e o nome novo, e as anteriores ficam', async () => {
    const pronto = await abrirEdicaoDe(NOME_DA_FICHA_COMPLETA);
    const antes = await pronto.fichas.listarVersoes(pronto.fichaCompleta);
    await tocar(t.novaRotina);
    await fireEvent.changeText(screen.getByLabelText(t.nomeDaRotina(2)), 'Treino Pernas');
    await tocar(t.adicionarLinha('Treino Pernas'));
    await tocar(t.escolherExercicio('Leg Press'));
    await tocar(t.subirRotina('Treino Pernas'));

    await tocar(t.salvar);

    expect(await screen.findByText(t.versaoSalva(3))).toBeTruthy();
    const versoes = await pronto.fichas.listarVersoes(pronto.fichaCompleta);
    const atual = versoes[2].rotinas;
    expect(atual.map((r) => [r.nome, r.diaDaSemana, r.itens.length])).toEqual([
      ['Treino Pernas', null, 1],
      ['Treino A', null, 3],
    ]);
    expect(atual[0].itens[0].exercicioId).toEqual(pronto.ids.get('Leg Press'));
    expect(versoes.slice(0, 2)).toEqual(antes);
  });

  it('a rotina nova sem nenhuma linha bloqueia o salvamento, indicando a rotina', async () => {
    const pronto = await abrirEdicaoDe(NOME_DA_FICHA_COMPLETA);
    await tocar(t.novaRotina);

    await tocar(t.salvar);

    expect(await screen.findByText(/^rotina "Treino B"\. Valor recebido: 0 linhas\./)).toBeTruthy();
    expect(await pronto.fichas.listarVersoes(pronto.fichaCompleta)).toHaveLength(2);
  });

  it('a ficha sem nenhuma rotina bloqueia, e incluir uma rotina com linha e salvar grava', async () => {
    const pronto = await abrirEdicaoDe(NOME_DA_FICHA_COMPLETA);
    await tocar(t.removerRotina('Treino A'));
    await tocar(t.salvar);

    const aviso = await screen.findByText(/^rotinas\. Valor recebido: 0 rotinas\./);
    expect(aviso.props.children).toMatch(/Formato esperado: ao menos 1 rotina/);
    expect(await pronto.fichas.listarVersoes(pronto.fichaCompleta)).toHaveLength(2);

    await tocar(t.novaRotina);
    await tocar(t.adicionarLinha('Treino A'));
    await tocar(t.escolherExercicio('Corrida'));
    await tocar(t.salvar);

    expect(await screen.findByText(t.versaoSalva(3))).toBeTruthy();
    expect(screen.queryByText(/Valor recebido: 0 rotinas/)).toBeNull();
  });

  it('o nome da rotina em branco bloqueia indicando a rotina pela posição, e o digitado fica', async () => {
    const pronto = await abrirEdicaoDe(NOME_DA_FICHA_COMPLETA);
    await fireEvent.changeText(screen.getByLabelText(t.nomeDaRotina(1)), '   ');

    await tocar(t.salvar);

    expect(
      await screen.findByText(/^rotina 1: nome\. Valor recebido: \. Formato esperado/),
    ).toBeTruthy();
    expect(screen.getByLabelText(t.nomeDaRotina(1)).props.value).toBe('   ');
    expect(await pronto.fichas.listarVersoes(pronto.fichaCompleta)).toHaveLength(2);
  });
});
