import type {
  ExercicioDoCatalogo,
  GruposDoExercicio,
  NovoExercicio,
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
  // Grava o exercício (ativo, origem `usuario`) e seus grupos numa transação: ou entra por inteiro,
  // ou nada. Nome de grupo fora da lista fixa falha com ErroDeValidacao, sem gravar nada.
  criarExercicio(exercicio: NovoExercicio): Promise<void>;
  // Acrescenta o texto como sinônimo do exercício. Texto igual (exato) já cadastrado nele não muda nada
  // nem falha; exercício que não existe falha com ErroDeValidacao, sem gravar. Não toca em histórico.
  adicionarSinonimo(exercicioId: Identificador, texto: string): Promise<void>;
  // Mescla por vínculo (US-006a), numa transação: arquiva o descartado, aponta ele (e quem já apontava
  // para ele) para o mantido e guarda o nome dele como sinônimo do mantido. Nada de sessão, versão ou
  // série é tocado (FI-4, RB02, RB03). Falha com ErroDeValidacao, sem gravar, se os dois forem o mesmo,
  // se algum não existir, se o descartado já foi mesclado ou se o mantido já foi mesclado em outro.
  mesclarExercicios(mantidoId: Identificador, descartadoId: Identificador): Promise<void>;
  // O mantido primeiro e depois todos os mesclados nele, qualquer que seja o id dado; só [id] se o
  // exercício nunca participou de uma mesclagem.
  exerciciosEquivalentes(exercicioId: Identificador): Promise<Identificador[]>;
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
