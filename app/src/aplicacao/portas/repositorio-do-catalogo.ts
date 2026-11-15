import type {
  ExercicioDoCatalogo,
  GruposDoExercicio,
  SituacaoDoExercicio,
} from '../../dominio/exercicio';
import type { Identificador } from '../../dominio/identificador';

export type { SituacaoDoExercicio };

export type SituacaoDaFichaNoCatalogo = 'ativa' | 'inativa' | 'arquivada';
export type OpcaoDeRemocao = 'arquivar' | 'excluir';

// Mínimo para arquivar em vez de excluir (US-002c, seção 18.6) e para ler o catálogo (US-004a).
// Editar grupos, criar e buscar exercícios entram nas US-004b a US-006. Nada aqui apaga versão, sessão ou série (RB02, RB03, RB04).
export interface RepositorioDoCatalogo {
  // Todos os exercícios, arquivados inclusive, sem ordem garantida. Quem exibe ordena.
  listarExercicios(): Promise<ExercicioDoCatalogo[]>;
  // Nula se o exercício não existe.
  // Troca os grupos do exercício por inteiro, numa transação: ou grava os dois papéis, ou nada.
  // Os nomes vêm da lista fixa de 16 grupos; nome fora dela ou exercício que não existe falha com
  // ErroDeValidacao, sem alterar nada. Não toca em série, sessão nem versão (FI-4).
  gravarGrupos(exercicioId: Identificador, grupos: GruposDoExercicio): Promise<void>;
  situacaoDoExercicio(exercicioId: Identificador): Promise<SituacaoDoExercicio | null>;
  // Com histórico (item de qualquer versão de ficha ou exercício de qualquer sessão): só arquivar.
  opcoesDeRemocaoDoExercicio(exercicioId: Identificador): Promise<OpcaoDeRemocao[]>;
  arquivarExercicio(exercicioId: Identificador): Promise<void>;
  // Falha, sem apagar nada, se o exercício tem histórico ou não existe.
  excluirExercicio(exercicioId: Identificador): Promise<void>;
  // Nula se a ficha não existe.
  situacaoDaFicha(fichaId: Identificador): Promise<SituacaoDaFichaNoCatalogo | null>;
  // Ficha nunca é excluída: a exclusão apagaria versões, que só recebem inserção (RB02).
  opcoesDeRemocaoDaFicha(fichaId: Identificador): Promise<OpcaoDeRemocao[]>;
  arquivarFicha(fichaId: Identificador): Promise<void>;
}
