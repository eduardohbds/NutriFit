import { fireEvent, render, screen } from '@testing-library/react-native';

import { TelaDasFichas } from '../../src/interface/telas/tela-das-fichas';
import { textos } from '../../src/interface/textos';
import {
  NOME_DA_FICHA_COMPLETA,
  NOME_DA_FICHA_DT01,
  fichasParaTela,
} from '../apoio/fichas-de-tela';

const t = textos.fichas;

type Pronto = Awaited<ReturnType<typeof fichasParaTela>>;

async function abrirEdicaoDe(nome: string, pronto?: Pronto) {
  const dados = pronto ?? (await fichasParaTela());
  await render(
    <TelaDasFichas
      listarFichas={dados.listarFichas}
      lerFichaParaEdicao={dados.lerFichaParaEdicao}
      buscarExercicios={dados.buscarExercicios}
      salvarFicha={dados.salvarFicha}
    />,
  );
  await fireEvent.press(await screen.findByRole('button', { name: t.abrirFicha(nome) }));
  await fireEvent.press(await screen.findByRole('button', { name: t.editar }));
  return dados;
}

const rotulo = (nome: keyof typeof t.campo, rotina: string, ordem: number) =>
  t.rotuloDoCampo(t.campo[nome], rotina, ordem);
const campo = (nome: keyof typeof t.campo, rotina: string, ordem: number) =>
  screen.getByLabelText(rotulo(nome, rotina, ordem));

async function salvar() {
  await fireEvent.press(await screen.findByRole('button', { name: t.salvar }));
}

describe('editar grupo, unilateral e observações pela tela (US-007d1)', () => {
  it('cada linha mostra o grupo, o unilateral e as observações como campos para alterar', async () => {
    await abrirEdicaoDe(NOME_DA_FICHA_COMPLETA);

    expect(campo('grupo', 'Treino A', 1).props.value).toBe('');
    expect(campo('grupo', 'Treino A', 2).props.value).toBe('A');
    expect(campo('unilateral', 'Treino A', 1).props.value).toBe(false);
    expect(campo('unilateral', 'Treino A', 2).props.value).toBe(true);
    expect(campo('observacoes', 'Treino A', 1).props.value).toBe('');
    expect(campo('observacoes', 'Treino A', 2).props.value).toBe('Bi-set com a elevação frontal');
  });

  it('guarda o que o usuário muda no rascunho, e nada é gravado', async () => {
    const pronto = await abrirEdicaoDe(NOME_DA_FICHA_COMPLETA);

    await fireEvent.changeText(campo('grupo', 'Treino A', 1), 'B');
    await fireEvent.changeText(campo('observacoes', 'Treino A', 1), 'Pegada fechada');
    await fireEvent(campo('unilateral', 'Treino A', 1), 'valueChange', true);

    expect(campo('grupo', 'Treino A', 1).props.value).toBe('B');
    expect(campo('observacoes', 'Treino A', 1).props.value).toBe('Pegada fechada');
    expect(campo('unilateral', 'Treino A', 1).props.value).toBe(true);
    const versoes = await pronto.fichas.listarVersoes(pronto.fichaCompleta);
    expect(versoes.map((v) => v.numero)).toEqual([1, 2]);
  });

  it('salvar grava o unilateral, as observações e o grupo na versão nova', async () => {
    const pronto = await abrirEdicaoDe(NOME_DA_FICHA_DT01);
    await fireEvent.changeText(campo('grupo', 'Segunda', 1), 'A');
    await fireEvent.changeText(campo('grupo', 'Segunda', 2), 'A');
    await fireEvent.changeText(campo('observacoes', 'Segunda', 1), 'Supersérie');
    await fireEvent(campo('unilateral', 'Segunda', 3), 'valueChange', true);

    await salvar();

    expect(await screen.findByText(t.versaoSalva(2))).toBeTruthy();
    const atual = (await pronto.fichas.buscarVersaoAtual(pronto.fichaDaDt01))!;
    const [primeiro, segundo, terceiro] = atual.rotinas[0].itens;
    expect([primeiro.grupoSequencia, segundo.grupoSequencia]).toEqual(['A', 'A']);
    expect(primeiro.observacoes).toBe('Supersérie');
    expect(terceiro.unilateral).toBe(true);
  });

  it('o grupo isolado bloqueia o salvamento indicando a rotina e a linha (VE17)', async () => {
    const pronto = await abrirEdicaoDe(NOME_DA_FICHA_COMPLETA);
    await fireEvent.changeText(campo('grupo', 'Treino A', 2), 'B');

    await salvar();

    expect(await screen.findByText(/^Treino A, linha 2: grupo\. Valor recebido: B\./)).toBeTruthy();
    const versoes = await pronto.fichas.listarVersoes(pronto.fichaCompleta);
    expect(versoes).toHaveLength(2);
    expect(campo('grupo', 'Treino A', 2).props.value).toBe('B');
  });

  it('o grupo em minúscula bloqueia, dizendo a letra de A a Z esperada', async () => {
    await abrirEdicaoDe(NOME_DA_FICHA_COMPLETA);
    await fireEvent.changeText(campo('grupo', 'Treino A', 2), 'a');
    await fireEvent.changeText(campo('grupo', 'Treino A', 3), 'a');

    await salvar();

    expect(
      await screen.findByText(/Valor recebido: a\. Formato esperado: uma letra de A a Z/),
    ).toBeTruthy();
  });
});

describe('editar o nome da ficha pela tela (US-007d1)', () => {
  it('o editor mostra o nome atual, e mudar o nome não grava nada', async () => {
    const pronto = await abrirEdicaoDe(NOME_DA_FICHA_COMPLETA);
    expect(screen.getByLabelText(t.nomeDaFicha).props.value).toBe(NOME_DA_FICHA_COMPLETA);

    await fireEvent.changeText(screen.getByLabelText(t.nomeDaFicha), 'Treino renomeado');

    expect(screen.getByLabelText(t.nomeDaFicha).props.value).toBe('Treino renomeado');
    const nomes = (await pronto.fichas.listarFichas()).map((f) => f.nome);
    expect(nomes).toContain(NOME_DA_FICHA_COMPLETA);
    expect(nomes).not.toContain('Treino renomeado');
  });

  it('salvar renomeia a ficha, e a lista mostra o nome novo com a versão nova', async () => {
    const pronto = await abrirEdicaoDe(NOME_DA_FICHA_COMPLETA);
    const versoesAntes = await pronto.fichas.listarVersoes(pronto.fichaCompleta);
    await fireEvent.changeText(screen.getByLabelText(t.nomeDaFicha), '  Treino renomeado ');

    await salvar();
    await screen.findByText(t.versaoSalva(3));
    await fireEvent.press(screen.getByRole('button', { name: t.voltar }));

    expect(await screen.findByText('Treino renomeado')).toBeTruthy();
    expect(screen.queryByText(NOME_DA_FICHA_COMPLETA)).toBeNull();
    const versoes = await pronto.fichas.listarVersoes(pronto.fichaCompleta);
    expect(versoes.slice(0, 2)).toEqual(versoesAntes);
  });

  it('o nome em branco bloqueia o salvamento sem gravar nada, e o digitado fica', async () => {
    const pronto = await abrirEdicaoDe(NOME_DA_FICHA_COMPLETA);
    await fireEvent.changeText(screen.getByLabelText(t.nomeDaFicha), '   ');

    await salvar();

    expect(
      await screen.findByText(/^nome da ficha\. Valor recebido: \. Formato esperado/),
    ).toBeTruthy();
    expect(screen.getByLabelText(t.nomeDaFicha).props.value).toBe('   ');
    const versoes = await pronto.fichas.listarVersoes(pronto.fichaCompleta);
    expect(versoes).toHaveLength(2);
  });

  it('cancelar a edição descarta o nome novo', async () => {
    await abrirEdicaoDe(NOME_DA_FICHA_COMPLETA);
    await fireEvent.changeText(screen.getByLabelText(t.nomeDaFicha), 'Treino renomeado');

    await fireEvent.press(screen.getByRole('button', { name: t.cancelarEdicao }));

    expect(await screen.findByText(NOME_DA_FICHA_COMPLETA)).toBeTruthy();
    expect(screen.queryByText('Treino renomeado')).toBeNull();
  });
});
