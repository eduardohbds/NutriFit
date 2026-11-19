import type { Identificador } from './identificador';

export type SituacaoDoExercicio = 'ativo' | 'arquivado';
export type OrigemDoExercicio = 'inicial' | 'usuario';

// Exercício do catálogo com os grupos pelo nome da lista fixa de 16 (seção 18.3). Os grupos são
// lidos na hora do cálculo (seção 18.6): nenhum valor derivado fica aqui.
export interface ExercicioDoCatalogo {
  id: Identificador;
  nome: string;
  situacao: SituacaoDoExercicio;
  origem: OrigemDoExercicio;
  unilateral: boolean;
  equipamento: string | null;
  sinonimos: string[];
  gruposDiretos: string[];
  gruposIndiretos: string[];
}

// Os dois papéis de um exercício na contagem de séries (seção 13.3), pelo nome do grupo.
export interface GruposDoExercicio {
  diretos: string[];
  indiretos: string[];
}

// Exercício criado pelo usuário (US-005a): entra ativo, com origem `usuario` e sem sinônimos
// (sinônimos são da US-005b).
export interface NovoExercicio {
  id: Identificador;
  nome: string;
  unilateral: boolean;
  equipamento: string | null;
  grupos: GruposDoExercicio;
}
