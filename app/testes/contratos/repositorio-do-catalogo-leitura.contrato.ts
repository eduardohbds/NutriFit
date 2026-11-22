import type { RepositorioDoCatalogo } from '../../src/aplicacao/portas/repositorio-do-catalogo';
import type { ExercicioDoCatalogo } from '../../src/dominio/exercicio';
import { Identificador } from '../../src/dominio/identificador';

export interface CenarioDeLeituraDoCatalogo {
  repositorio: RepositorioDoCatalogo;
  // Grava os exercícios no armazenamento antes da leitura, sem passar pela porta.
  semear(exercicios: ExercicioDoCatalogo[]): void;
}

function exercicio(sufixo: string, resto: Partial<ExercicioDoCatalogo>): ExercicioDoCatalogo {
  return {
    id: Identificador.de(`00000000-0000-7000-8000-00000000${sufixo}`),
    nome: 'Exercício',
    situacao: 'ativo',
    origem: 'usuario',
    unilateral: false,
    equipamento: null,
    sinonimos: [],
    gruposDiretos: [],
    gruposIndiretos: [],
    ...resto,
  };
}

// Roda contra o falso em memória e contra o adaptador SQLite: os dois precisam passar (RT05).
export function contratoDeLeituraDoCatalogo(nome: string, criar: () => CenarioDeLeituraDoCatalogo) {
  describe(`contrato de leitura do RepositorioDoCatalogo: ${nome}`, () => {
    it('devolve o exercício com grupos diretos, indiretos, sinônimos e os demais campos', async () => {
      const { repositorio, semear } = criar();
      const supino = exercicio('0001', {
        nome: 'Supino Teste',
        origem: 'inicial',
        equipamento: 'Banco',
        sinonimos: ['Bench Press Teste'],
        gruposDiretos: ['Peitoral'],
        gruposIndiretos: ['Tríceps', 'Ombro anterior'],
      });
      semear([supino]);

      const lidos = await repositorio.listarExercicios();

      expect(lidos).toHaveLength(1);
      expect(lidos[0]).toMatchObject({ ...supino, gruposIndiretos: expect.any(Array) });
      expect([...lidos[0].gruposIndiretos].sort()).toEqual(['Ombro anterior', 'Tríceps']);
    });

    it('depois de arquivar, a leitura devolve o exercício como arquivado, e não como ativo', async () => {
      const { repositorio, semear } = criar();
      const supino = exercicio('0003', { nome: 'Supino Arquivado Teste' });
      semear([supino]);

      await repositorio.arquivarExercicio(supino.id);

      const [lido] = await repositorio.listarExercicios();
      expect(lido.situacao).toBe('arquivado');
    });

    it('devolve exercício sem grupo e sem sinônimo com listas vazias (cardio fica fora da contagem)', async () => {
      const { repositorio, semear } = criar();
      semear([exercicio('0002', { nome: 'Corrida Teste' })]);

      const [corrida] = await repositorio.listarExercicios();

      expect(corrida.gruposDiretos).toEqual([]);
      expect(corrida.gruposIndiretos).toEqual([]);
      expect(corrida.sinonimos).toEqual([]);
    });

    it('lista também os arquivados e marca a situação e o lado único', async () => {
      const { repositorio, semear } = criar();
      semear([
        exercicio('0003', { nome: 'Antigo', situacao: 'arquivado' }),
        exercicio('0004', { nome: 'Lunges Teste', unilateral: true }),
      ]);

      const lidos = await repositorio.listarExercicios();

      const porNome = Object.fromEntries(lidos.map((e) => [e.nome, e]));
      expect(porNome['Antigo'].situacao).toBe('arquivado');
      expect(porNome['Lunges Teste'].unilateral).toBe(true);
    });

    it('catálogo vazio devolve lista vazia', async () => {
      const { repositorio } = criar();
      expect(await repositorio.listarExercicios()).toEqual([]);
    });
  });
}
