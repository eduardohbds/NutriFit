import { MesclarExercicios } from '../../src/aplicacao/casos-de-uso/mesclar-exercicios';
import { ErroDeValidacao } from '../../src/dominio/erro-de-validacao';
import type { ExercicioDoCatalogo } from '../../src/dominio/exercicio';
import { Identificador } from '../../src/dominio/identificador';
import { RepositorioDoCatalogoEmMemoria } from '../dubles/repositorio-do-catalogo-em-memoria';

const MANTIDO = Identificador.de('00000000-0000-7000-8000-0000000c0001');
const DESCARTADO = Identificador.de('00000000-0000-7000-8000-0000000c0002');

function exercicio(id: Identificador, nome: string): ExercicioDoCatalogo {
  return {
    id,
    nome,
    situacao: 'ativo',
    origem: 'inicial',
    unilateral: false,
    equipamento: null,
    sinonimos: [],
    gruposDiretos: ['Peitoral'],
    gruposIndiretos: [],
  };
}

function iniciar() {
  const catalogo = new RepositorioDoCatalogoEmMemoria();
  catalogo.semearCatalogo([
    exercicio(MANTIDO, 'Supino Reto'),
    exercicio(DESCARTADO, 'Supino Plano'),
  ]);
  return { catalogo, caso: new MesclarExercicios(catalogo) };
}

async function recusa(promessa: Promise<unknown>): Promise<ErroDeValidacao> {
  const erro = await promessa.then(
    () => undefined,
    (e: unknown) => e,
  );
  expect(erro).toBeInstanceOf(ErroDeValidacao);
  return erro as ErroDeValidacao;
}

describe('MesclarExercicios', () => {
  it('mescla o descartado no mantido: arquiva um e guarda o nome dele como sinônimo do outro', async () => {
    const { caso, catalogo } = iniciar();

    await caso.executar({ mantidoId: MANTIDO, descartadoId: DESCARTADO });

    expect(await catalogo.situacaoDoExercicio(DESCARTADO)).toBe('arquivado');
    expect(await catalogo.situacaoDoExercicio(MANTIDO)).toBe('ativo');
    const mantido = (await catalogo.listarExercicios()).find((e) => e.id.valor === MANTIDO.valor);
    expect(mantido?.sinonimos).toEqual(['Supino Plano']);
  });

  it('recusa o mesmo exercício nos dois lados dizendo o valor recebido e o formato esperado', async () => {
    const { caso, catalogo } = iniciar();

    const erro = await recusa(caso.executar({ mantidoId: MANTIDO, descartadoId: MANTIDO }));

    expect(erro.campo).toBe('descartadoId');
    expect(erro.esperado).toMatch(/exercício diferente do mantido/);
    expect(erro.recebido).toBe(MANTIDO.valor);
    expect(await catalogo.situacaoDoExercicio(MANTIDO)).toBe('ativo');
  });

  it('recusa um exercício que não existe, sem gravar', async () => {
    const { caso, catalogo } = iniciar();
    const inexistente = Identificador.de('00000000-0000-7000-8000-0000000c0099');

    await recusa(caso.executar({ mantidoId: MANTIDO, descartadoId: inexistente }));

    expect(await catalogo.situacaoDoExercicio(MANTIDO)).toBe('ativo');
    expect(await catalogo.exerciciosEquivalentes(MANTIDO)).toEqual([MANTIDO]);
  });
});
