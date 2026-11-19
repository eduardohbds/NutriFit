import { CriarExercicio } from '../../src/aplicacao/casos-de-uso/criar-exercicio';
import { ErroDeValidacao } from '../../src/dominio/erro-de-validacao';
import { GeradorDeIdentificadorSequencial } from '../dubles/gerador-de-identificador-sequencial';
import { RepositorioDoCatalogoEmMemoria } from '../dubles/repositorio-do-catalogo-em-memoria';

function iniciar() {
  const catalogo = new RepositorioDoCatalogoEmMemoria();
  const caso = new CriarExercicio(catalogo, new GeradorDeIdentificadorSequencial());
  return { caso, catalogo };
}

async function recusa(promessa: Promise<unknown>): Promise<ErroDeValidacao> {
  const erro = await promessa.then(
    () => undefined,
    (e: unknown) => e,
  );
  expect(erro).toBeInstanceOf(ErroDeValidacao);
  return erro as ErroDeValidacao;
}

describe('CriarExercicio', () => {
  it('cria com grupo direto costas e indireto bíceps e o deixa disponível no catálogo', async () => {
    const { caso, catalogo } = iniciar();

    const resultado = await caso.executar({
      nome: 'Remada Curvada',
      gruposDiretos: ['Costas'],
      gruposIndiretos: ['Bíceps'],
    });

    expect(resultado.criado).toBe(true);
    expect(await catalogo.listarExercicios()).toMatchObject([
      {
        nome: 'Remada Curvada',
        situacao: 'ativo',
        origem: 'usuario',
        unilateral: false,
        equipamento: null,
        gruposDiretos: ['Costas'],
        gruposIndiretos: ['Bíceps'],
      },
    ]);
  });

  it('nome vazio é recusado com o valor recebido e o formato esperado, sem gravar', async () => {
    const { caso, catalogo } = iniciar();

    const erro = await recusa(
      caso.executar({ nome: '   ', gruposDiretos: ['Costas'], gruposIndiretos: [] }),
    );

    expect(erro.campo).toBe('nome');
    expect(erro.esperado).toMatch(/texto não vazio/);
    expect(await catalogo.listarExercicios()).toEqual([]);
  });

  it('grupo fora da lista é recusado, sem gravar', async () => {
    const { caso, catalogo } = iniciar();

    const erro = await recusa(
      caso.executar({ nome: 'Remada', gruposDiretos: ['Cérebro'], gruposIndiretos: [] }),
    );

    expect(erro.campo).toBe('gruposDiretos');
    expect(erro.recebido).toBe('Cérebro');
    expect(await catalogo.listarExercicios()).toEqual([]);
  });

  it('sem nenhum grupo pede confirmação em vez de gravar, e grava depois de confirmado', async () => {
    const { caso, catalogo } = iniciar();
    const pedido = { nome: 'Corrida', gruposDiretos: [], gruposIndiretos: [] };

    expect(await caso.executar(pedido)).toEqual({
      criado: false,
      motivo: 'pede_confirmacao_sem_grupos',
    });
    expect(await catalogo.listarExercicios()).toEqual([]);

    expect((await caso.executar({ ...pedido, confirmouSemGrupos: true })).criado).toBe(true);
    expect(await catalogo.listarExercicios()).toHaveLength(1);
  });
});
