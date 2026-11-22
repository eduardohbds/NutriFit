import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { TelaDasFichas } from '../../src/interface/telas/tela-das-fichas';
import { textos } from '../../src/interface/textos';
import {
  NOME_DA_FICHA_COMPLETA,
  NOME_DA_FICHA_DT01,
  fichasParaTela,
} from '../apoio/fichas-de-tela';

const t = textos.fichas;

type Pronto = Awaited<ReturnType<typeof fichasParaTela>>;

async function renderizar(pronto: Pronto, comBusca: boolean) {
  await render(
    <TelaDasFichas
      listarFichas={pronto.listarFichas}
      lerFichaParaEdicao={pronto.lerFichaParaEdicao}
      buscarExercicios={comBusca ? pronto.buscarExercicios : undefined}
    />,
  );
}

async function abrirFicha(nome: string) {
  await fireEvent.press(await screen.findByRole('button', { name: t.abrirFicha(nome) }));
}

async function abrirEdicaoDe(nome: string, antes?: (pronto: Pronto) => Promise<void>) {
  const pronto = await fichasParaTela();
  await antes?.(pronto);
  await renderizar(pronto, true);
  await abrirFicha(nome);
  await fireEvent.press(await screen.findByRole('button', { name: t.editar }));
  return pronto;
}

const oferta = (nome: string) => screen.queryByRole('button', { name: t.escolherExercicio(nome) });

async function escolher(nome: string) {
  await fireEvent.press(await screen.findByRole('button', { name: t.escolherExercicio(nome) }));
}

const campo = (nome: keyof typeof t.campo, rotina: string, ordem: number) =>
  screen.getByLabelText(t.rotuloDoCampo(t.campo[nome], rotina, ordem));

async function abrirBuscaDaLinha(rotina: string, ordem: number) {
  const botao = await screen.findByRole('button', { name: t.trocarExercicio(rotina, ordem) });
  await fireEvent.press(botao);
}

describe('edição das linhas da ficha: escolher o exercício (US-007c2)', () => {
  it('sem a busca de exercícios a tela continua só de leitura, sem o botão de editar', async () => {
    await renderizar(await fichasParaTela(), false);
    await abrirFicha(NOME_DA_FICHA_DT01);

    await screen.findByText(t.exercicio(1, 'Supino Reto'));
    expect(screen.queryByRole('button', { name: t.editar })).toBeNull();
  });

  it('a busca oferece os exercícios do catálogo e filtra por parte do nome', async () => {
    await abrirEdicaoDe(NOME_DA_FICHA_DT01);
    await abrirBuscaDaLinha('Segunda', 1);

    await screen.findByRole('button', { name: t.escolherExercicio('Supino Reto') });
    expect(oferta('Remada Curvada')).toBeTruthy();
    await fireEvent.changeText(screen.getByLabelText(t.buscarExercicio), 'supin');

    await waitFor(() => expect(oferta('Remada Curvada')).toBeNull());
    expect(oferta('Supino Inclinado com Halteres')).toBeTruthy();
  });

  it('a busca acha o exercício pelo sinônimo', async () => {
    await abrirEdicaoDe(NOME_DA_FICHA_DT01);
    await abrirBuscaDaLinha('Segunda', 1);

    await fireEvent.changeText(await screen.findByLabelText(t.buscarExercicio), 'reverse');

    await screen.findByRole('button', { name: t.escolherExercicio('Rosca de Punho Inversa') });
    expect(oferta('Supino Reto')).toBeNull();
  });

  it('exercício arquivado não é oferecido, e a busca sem resultado avisa', async () => {
    const arquivar = (p: Pronto) => p.catalogo.arquivarExercicio(p.ids.get('Cross Over')!);
    await abrirEdicaoDe(NOME_DA_FICHA_DT01, arquivar);
    await abrirBuscaDaLinha('Segunda', 1);

    await fireEvent.changeText(await screen.findByLabelText(t.buscarExercicio), 'cross');

    expect(await screen.findByText(t.semResultado)).toBeTruthy();
    expect(oferta('Cross Over')).toBeNull();
  });

  it('escolher um exercício troca o da linha e leva de volta à edição', async () => {
    await abrirEdicaoDe(NOME_DA_FICHA_DT01);
    await abrirBuscaDaLinha('Segunda', 1);

    await escolher('Rosca de Punho Inversa');

    expect(await screen.findByText(t.exercicio(1, 'Rosca de Punho Inversa'))).toBeTruthy();
    expect(screen.queryByText(t.exercicio(1, 'Supino Reto'))).toBeNull();
    expect(screen.getByText(t.exercicio(2, 'Supino Inclinado com Halteres'))).toBeTruthy();
  });
});

describe('edição das linhas da ficha: digitar as séries (US-007c2)', () => {
  it('mostra os campos de cada linha com o texto da planilha, para o usuário alterar', async () => {
    await abrirEdicaoDe(NOME_DA_FICHA_COMPLETA);

    expect(campo('quantidade', 'Treino A', 1).props.value).toBe('4');
    expect(campo('meta', 'Treino A', 1).props.value).toBe('12/10/8/falha');
    expect(campo('carga', 'Treino A', 1).props.value).toBe('60/62,5/65/65');
    expect(campo('tecnica', 'Treino A', 1).props.value).toBe('aquecimento/-/-/-');
    expect(campo('descanso', 'Treino A', 1).props.value).toBe('90/90/90/120');
  });

  it('guarda o que o usuário digita, valor único ou lista por barra, e mantém ao trocar outra linha', async () => {
    await abrirEdicaoDe(NOME_DA_FICHA_DT01);

    await fireEvent.changeText(campo('meta', 'Segunda', 1), '12/10/8/falha');
    await fireEvent.changeText(campo('descanso', 'Segunda', 1), '90/90/90/120');
    await fireEvent.changeText(campo('carga', 'Segunda', 2), '24');
    await abrirBuscaDaLinha('Terça', 1);
    await escolher('Barra Fixa');

    expect(campo('meta', 'Segunda', 1).props.value).toBe('12/10/8/falha');
    expect(campo('descanso', 'Segunda', 1).props.value).toBe('90/90/90/120');
    expect(campo('carga', 'Segunda', 2).props.value).toBe('24');
  });

  it('aceita texto ainda incompleto, sem recusar nem apagar o que foi digitado', async () => {
    await abrirEdicaoDe(NOME_DA_FICHA_DT01);

    await fireEvent.changeText(campo('descanso', 'Segunda', 1), '90/90/');

    expect(campo('descanso', 'Segunda', 1).props.value).toBe('90/90/');
  });

  it('nada é gravado: a ficha continua com a mesma versão depois das edições', async () => {
    const pronto = await abrirEdicaoDe(NOME_DA_FICHA_DT01);
    await fireEvent.changeText(campo('meta', 'Segunda', 1), '8-12');
    await abrirBuscaDaLinha('Segunda', 2);
    await escolher('Barra Fixa');

    const versoes = await pronto.fichas.listarVersoes(pronto.fichaDaDt01);

    expect(versoes.map((v) => v.numero)).toEqual([1]);
    expect(await pronto.fichas.listarFichas()).toHaveLength(2);
  });

  it('cancelar a edição descarta o rascunho e volta à ficha como estava gravada', async () => {
    await abrirEdicaoDe(NOME_DA_FICHA_COMPLETA);
    await fireEvent.changeText(campo('meta', 'Treino A', 1), '8-12');

    await fireEvent.press(screen.getByRole('button', { name: t.cancelarEdicao }));

    expect(await screen.findByText(t.meta('12/10/8/falha'))).toBeTruthy();
    expect(screen.queryByText(t.meta('8-12'))).toBeNull();
  });
});
