import { ListarExerciciosDoCatalogo } from '../../src/aplicacao/casos-de-uso/listar-exercicios-do-catalogo';
import type { ExercicioDoCatalogo } from '../../src/dominio/exercicio';
import { GeradorDeIdentificadorSequencial } from '../dubles/gerador-de-identificador-sequencial';
import { RepositorioDoCatalogoEmMemoria } from '../dubles/repositorio-do-catalogo-em-memoria';

const gerador = new GeradorDeIdentificadorSequencial();

function exercicio(nome: string, situacao: 'ativo' | 'arquivado' = 'ativo'): ExercicioDoCatalogo {
  return {
    id: gerador.gerar(),
    nome,
    situacao,
    origem: 'inicial',
    unilateral: false,
    equipamento: null,
    sinonimos: [],
    gruposDiretos: [],
    gruposIndiretos: [],
  };
}

async function listar(exercicios: ExercicioDoCatalogo[]) {
  const catalogo = new RepositorioDoCatalogoEmMemoria();
  catalogo.semearCatalogo(exercicios);
  return (await new ListarExerciciosDoCatalogo(catalogo).executar()).map((e) => e.nome);
}

describe('ListarExerciciosDoCatalogo', () => {
  it('devolve os exercícios em ordem alfabética, sem diferenciar acento nem maiúscula', async () => {
    const nomes = await listar([
      exercicio('Zeta'),
      exercicio('Ábaco'),
      exercicio('barra'),
      exercicio('Agachamento'),
    ]);

    expect(nomes).toEqual(['Ábaco', 'Agachamento', 'barra', 'Zeta']);
  });

  it('não lista exercícios arquivados', async () => {
    const nomes = await listar([exercicio('Antigo', 'arquivado'), exercicio('Atual')]);

    expect(nomes).toEqual(['Atual']);
  });
});
