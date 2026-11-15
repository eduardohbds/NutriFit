import type { Identificador } from '../../dominio/identificador';

export type SituacaoDoExercicio = 'ativo' | 'arquivado';
export type SituacaoDaFichaNoCatalogo = 'ativa' | 'inativa' | 'arquivada';
export type OpcaoDeRemocao = 'arquivar' | 'excluir';

// Mínimo para arquivar em vez de excluir (US-002c, seção 18.6). Criar, editar e buscar exercícios
// entram nas US-004 a US-006. Nada aqui apaga versão, sessão ou série (RB02, RB03, RB04).
export interface RepositorioDoCatalogo {
  // Nula se o exercício não existe.
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
