import { fireEvent, render, screen } from '@testing-library/react-native';

import { TelaDasFichas } from '../../src/interface/telas/tela-das-fichas';
import { textos } from '../../src/interface/textos';
import { NOME_DA_FICHA_COMPLETA, fichasParaTela } from '../apoio/fichas-de-tela';

const t = textos.fichas;
const ROTINA = 'Treino A';

async function abrirEdicao() {
  const pronto = await fichasParaTela();
  await render(
    <TelaDasFichas
      listarFichas={pronto.listarFichas}
      lerFichaParaEdicao={pronto.lerFichaParaEdicao}
      buscarExercicios={pronto.buscarExercicios}
      salvarFicha={pronto.salvarFicha}
    />,
  );
  const abrir = await screen.findByRole('button', { name: t.abrirFicha(NOME_DA_FICHA_COMPLETA) });
  await fireEvent.press(abrir);
  await fireEvent.press(await screen.findByRole('button', { name: t.editar }));
  return pronto;
}

const botao = (nome: string) => screen.queryByRole('button', { name: nome });
const campo = (nome: keyof typeof t.campo, ordem: number) =>
  screen.getByLabelText(t.rotuloDoCampo(t.campo[nome], ROTINA, ordem));

async function tocar(nome: string) {
  await fireEvent.press(await screen.findByRole('button', { name: nome }));
}

async function incluirLinha(exercicio: string) {
  await tocar(t.adicionarLinha(ROTINA));
  await tocar(t.escolherExercicio(exercicio));
}

describe('botões das linhas na edição (US-007d2)', () => {
  it('a primeira linha não sobe, a última não desce, e todas podem ser removidas', async () => {
    await abrirEdicao();

    expect(botao(t.subirLinha(ROTINA, 1))).toBeNull();
    expect(botao(t.descerLinha(ROTINA, 1))).toBeTruthy();
    expect(botao(t.subirLinha(ROTINA, 2))).toBeTruthy();
    expect(botao(t.descerLinha(ROTINA, 2))).toBeTruthy();
    expect(botao(t.subirLinha(ROTINA, 3))).toBeTruthy();
    expect(botao(t.descerLinha(ROTINA, 3))).toBeNull();
    for (const ordem of [1, 2, 3]) expect(botao(t.removerLinha(ROTINA, ordem))).toBeTruthy();
  });
});

describe('incluir uma linha (US-007d2)', () => {
  it('a linha escolhida entra no fim com 3 séries, meta 10 e os demais campos vazios', async () => {
    await abrirEdicao();

    await incluirLinha('Corrida');

    expect(await screen.findByText(t.exercicio(4, 'Corrida'))).toBeTruthy();
    expect(campo('quantidade', 4).props.value).toBe('3');
    expect(campo('meta', 4).props.value).toBe('10');
    expect(campo('carga', 4).props.value).toBe('');
    expect(campo('grupo', 4).props.value).toBe('');
    expect(campo('unilateral', 4).props.value).toBe(false);
    expect(campo('observacoes', 4).props.value).toBe('');
  });

  it('só os exercícios ativos do catálogo são oferecidos, como na troca de exercício', async () => {
    const pronto = await fichasParaTela();
    await pronto.catalogo.arquivarExercicio(pronto.ids.get('Cross Over')!);
    await render(
      <TelaDasFichas
        listarFichas={pronto.listarFichas}
        lerFichaParaEdicao={pronto.lerFichaParaEdicao}
        buscarExercicios={pronto.buscarExercicios}
      />,
    );
    await tocar(t.abrirFicha(NOME_DA_FICHA_COMPLETA));
    await tocar(t.editar);
    await tocar(t.adicionarLinha(ROTINA));

    await fireEvent.changeText(await screen.findByLabelText(t.buscarExercicio), 'cross');

    expect(await screen.findByText(t.semResultado)).toBeTruthy();
  });
});

describe('remover, subir e descer linhas (US-007d2)', () => {
  it('remover tira a linha, e as seguintes sobem de número', async () => {
    await abrirEdicao();

    await tocar(t.removerLinha(ROTINA, 2));

    expect(await screen.findByText(t.exercicio(2, 'Elevação Frontal'))).toBeTruthy();
    expect(screen.queryByText(t.exercicio(3, 'Elevação Frontal'))).toBeNull();
    expect(screen.queryByText(t.exercicio(2, 'Elevação Lateral'))).toBeNull();
  });

  it('descer troca a linha com a seguinte, e os campos vão junto com ela', async () => {
    await abrirEdicao();
    expect(campo('meta', 1).props.value).toBe('12/10/8/falha');

    await tocar(t.descerLinha(ROTINA, 1));

    expect(await screen.findByText(t.exercicio(1, 'Elevação Lateral'))).toBeTruthy();
    expect(screen.getByText(t.exercicio(2, 'Supino Reto'))).toBeTruthy();
    expect(campo('meta', 2).props.value).toBe('12/10/8/falha');
    expect(campo('meta', 1).props.value).toBe('15');
  });

  it('subir troca a linha com a anterior', async () => {
    await abrirEdicao();

    await tocar(t.subirLinha(ROTINA, 3));

    expect(await screen.findByText(t.exercicio(2, 'Elevação Frontal'))).toBeTruthy();
    expect(screen.getByText(t.exercicio(3, 'Elevação Lateral'))).toBeTruthy();
  });

  it('nada é gravado ao mexer nas linhas, e cancelar descarta tudo', async () => {
    const pronto = await abrirEdicao();
    await incluirLinha('Corrida');
    await tocar(t.removerLinha(ROTINA, 1));
    await tocar(t.descerLinha(ROTINA, 1));

    const versoes = await pronto.fichas.listarVersoes(pronto.fichaCompleta);
    await tocar(t.cancelarEdicao);

    expect(versoes.map((v) => v.numero)).toEqual([1, 2]);
    expect(await screen.findByText(t.exercicio(1, 'Supino Reto'))).toBeTruthy();
    expect(screen.queryByText(t.exercicio(4, 'Corrida'))).toBeNull();
  });
});

describe('salvar com as linhas mexidas (US-007d2)', () => {
  it('a versão nova traz as linhas na ordem do rascunho, com a linha nova, e as anteriores ficam', async () => {
    const pronto = await abrirEdicao();
    const antes = await pronto.fichas.listarVersoes(pronto.fichaCompleta);
    await incluirLinha('Corrida');
    await tocar(t.subirLinha(ROTINA, 3));

    await tocar(t.salvar);

    expect(await screen.findByText(t.versaoSalva(3))).toBeTruthy();
    const versoes = await pronto.fichas.listarVersoes(pronto.fichaCompleta);
    const nomes = new Map([...pronto.ids].map(([nome, id]) => [id.valor, nome]));
    const itens = versoes[2].rotinas[0].itens;
    expect(itens.map((i) => nomes.get(i.exercicioId.valor))).toEqual([
      'Supino Reto',
      'Elevação Frontal',
      'Elevação Lateral',
      'Corrida',
    ]);
    expect(itens[3].series).toHaveLength(3);
    expect(itens[3].series.map((s) => s.meta.minimo)).toEqual([10, 10, 10]);
    expect(versoes.slice(0, 2)).toEqual(antes);
  });

  it('a rotina sem nenhuma linha bloqueia, indicando a rotina, sem gravar nada', async () => {
    const pronto = await abrirEdicao();
    for (let i = 0; i < 3; i++) await tocar(t.removerLinha(ROTINA, 1));

    await tocar(t.salvar);

    const aviso = await screen.findByText(/^rotina "Treino A"\. Valor recebido: 0 linhas\./);
    expect(aviso.props.children).toMatch(/Formato esperado: ao menos 1 linha/);
    const versoes = await pronto.fichas.listarVersoes(pronto.fichaCompleta);
    expect(versoes).toHaveLength(2);
    expect(botao(t.adicionarLinha(ROTINA))).toBeTruthy();
  });

  it('incluir uma linha na rotina vazia e salvar de novo grava a versão', async () => {
    const pronto = await abrirEdicao();
    for (let i = 0; i < 3; i++) await tocar(t.removerLinha(ROTINA, 1));
    await tocar(t.salvar);
    await screen.findByText(/Valor recebido: 0 linhas/);

    await incluirLinha('Corrida');
    await tocar(t.salvar);

    expect(await screen.findByText(t.versaoSalva(3))).toBeTruthy();
    const atual = await pronto.fichas.buscarVersaoAtual(pronto.fichaCompleta);
    expect(atual?.rotinas[0].itens).toHaveLength(1);
    expect(screen.queryByText(/Valor recebido: 0 linhas/)).toBeNull();
  });
});
