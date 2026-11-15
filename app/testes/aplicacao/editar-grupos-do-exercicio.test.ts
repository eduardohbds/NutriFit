import { EditarGruposDoExercicio } from '../../src/aplicacao/casos-de-uso/editar-grupos-do-exercicio';
import { ErroDeValidacao } from '../../src/dominio/erro-de-validacao';
import type { ExercicioDoCatalogo } from '../../src/dominio/exercicio';
import { Identificador } from '../../src/dominio/identificador';
import { RepositorioDoCatalogoEmMemoria } from '../dubles/repositorio-do-catalogo-em-memoria';

const ID = Identificador.de('00000000-0000-7000-8000-000000000b01');

const SUPINO: ExercicioDoCatalogo = {
  id: ID,
  nome: 'Supino Reto',
  situacao: 'ativo',
  origem: 'inicial',
  unilateral: false,
  equipamento: null,
  sinonimos: [],
  gruposDiretos: ['Peitoral'],
  gruposIndiretos: ['Tríceps', 'Ombro anterior'],
};

function iniciar() {
  const catalogo = new RepositorioDoCatalogoEmMemoria();
  catalogo.semearCatalogo([SUPINO]);
  const caso = new EditarGruposDoExercicio(catalogo);
  const gruposAtuais = async () => {
    const [e] = await catalogo.listarExercicios();
    return { diretos: e.gruposDiretos, indiretos: [...e.gruposIndiretos].sort() };
  };
  return { caso, gruposAtuais };
}

async function recusa(promessa: Promise<unknown>): Promise<ErroDeValidacao> {
  const erro = await promessa.then(
    () => undefined,
    (e: unknown) => e,
  );
  expect(erro).toBeInstanceOf(ErroDeValidacao);
  return erro as ErroDeValidacao;
}

describe('EditarGruposDoExercicio (VE20, seção 18.3)', () => {
  it('grava grupos escolhidos entre os 16 fixos, trocando os anteriores por inteiro', async () => {
    const { caso, gruposAtuais } = iniciar();

    const resultado = await caso.executar({
      exercicioId: ID,
      gruposDiretos: ['Costas'],
      gruposIndiretos: ['Bíceps'],
    });

    expect(resultado).toEqual({ salvo: true });
    expect(await gruposAtuais()).toEqual({ diretos: ['Costas'], indiretos: ['Bíceps'] });
  });

  it('aceita cada um dos 16 grupos da lista fixa', async () => {
    const { caso, gruposAtuais } = iniciar();
    const todos = [
      'Peitoral',
      'Costas',
      'Trapézio',
      'Ombro anterior',
      'Ombro lateral',
      'Ombro posterior',
      'Bíceps',
      'Tríceps',
      'Antebraço',
      'Abdômen',
      'Lombar',
      'Quadríceps',
      'Posterior de coxa',
      'Glúteos',
      'Adutores',
      'Panturrilha',
    ];

    await caso.executar({ exercicioId: ID, gruposDiretos: todos, gruposIndiretos: [] });

    expect((await gruposAtuais()).diretos.sort()).toEqual([...todos].sort());
  });

  it('grupo fora da lista fixa é rejeitado com o valor recebido e a lista esperada, sem gravar', async () => {
    const { caso, gruposAtuais } = iniciar();

    const erro = await recusa(
      caso.executar({ exercicioId: ID, gruposDiretos: ['Pescoço'], gruposIndiretos: [] }),
    );

    expect(erro.recebido).toBe('Pescoço');
    expect(erro.esperado).toContain('Peitoral');
    expect(erro.message).toContain('Pescoço');
    expect(await gruposAtuais()).toEqual({
      diretos: ['Peitoral'],
      indiretos: ['Ombro anterior', 'Tríceps'],
    });
  });

  it('o mesmo grupo como direto e indireto bloqueia o salvamento e diz qual foi', async () => {
    const { caso, gruposAtuais } = iniciar();

    const erro = await recusa(
      caso.executar({
        exercicioId: ID,
        gruposDiretos: ['Peitoral'],
        gruposIndiretos: ['Peitoral'],
      }),
    );

    expect(erro.recebido).toBe('Peitoral');
    expect(erro.esperado).toMatch(/direto ou indireto/);
    expect(await gruposAtuais()).toEqual({
      diretos: ['Peitoral'],
      indiretos: ['Ombro anterior', 'Tríceps'],
    });
  });

  it('grupo repetido na mesma lista é rejeitado', async () => {
    const { caso } = iniciar();

    const erro = await recusa(
      caso.executar({ exercicioId: ID, gruposDiretos: ['Costas', 'Costas'], gruposIndiretos: [] }),
    );

    expect(erro.recebido).toBe('Costas');
  });

  it('grupos indiretos sem nenhum direto bloqueiam o salvamento', async () => {
    const { caso, gruposAtuais } = iniciar();

    const erro = await recusa(
      caso.executar({ exercicioId: ID, gruposDiretos: [], gruposIndiretos: ['Tríceps'] }),
    );

    expect(erro.campo).toBe('gruposIndiretos');
    expect(erro.esperado).toMatch(/pelo menos um grupo direto/);
    expect((await gruposAtuais()).diretos).toEqual(['Peitoral']);
  });

  it('exercício sem nenhum grupo pede confirmação em vez de gravar direto', async () => {
    const { caso, gruposAtuais } = iniciar();

    const resultado = await caso.executar({
      exercicioId: ID,
      gruposDiretos: [],
      gruposIndiretos: [],
    });

    expect(resultado).toEqual({ salvo: false, motivo: 'pede_confirmacao_sem_grupos' });
    expect((await gruposAtuais()).diretos).toEqual(['Peitoral']);
  });

  it('com a confirmação do usuário, o exercício fica sem grupos e fora da contagem', async () => {
    const { caso, gruposAtuais } = iniciar();

    const resultado = await caso.executar({
      exercicioId: ID,
      gruposDiretos: [],
      gruposIndiretos: [],
      confirmouSemGrupos: true,
    });

    expect(resultado).toEqual({ salvo: true });
    expect(await gruposAtuais()).toEqual({ diretos: [], indiretos: [] });
  });
});
