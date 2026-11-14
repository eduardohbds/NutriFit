import type { Carga } from './carga';
import type { Identificador } from './identificador';
import type { InstanteUtc } from './instante-utc';

// Tipos mínimos para guardar uma sessão e as séries executadas (US-002b). RIR, tipo e meta ganham
// regras na US-013; aqui os campos são dados sem validação. Nenhum campo é valor derivado
// (classificação, contagens, recordes, 1RM): esses são sempre recalculados (seção 18.6).
export type SituacaoDaSessao = 'em_andamento' | 'concluida' | 'parcial' | 'descartada';
export type TipoDeSerie = 'trabalho' | 'aquecimento' | 'tempo' | 'cardio';

export interface SerieExecutada {
  id: Identificador;
  tipo: TipoDeSerie;
  carga: Carga | null;
  repeticoes: number | null;
  repeticoesOutroLado: number | null;
  segundos: number | null;
  segundosOutroLado: number | null;
  rir: number | null;
  tecnica: string | null;
  concluidaEm: InstanteUtc;
  // Série corrigida ou removida fica guardada, só com esta marca (RF02, seção 18.6).
  removidaEm: InstanteUtc | null;
}

export interface ExercicioDaSessao {
  id: Identificador;
  exercicioId: Identificador;
  // Vazio quando o exercício foi incluído só na sessão.
  itemOrigemId: Identificador | null;
  observacoes: string | null;
  // Todas as séries, na ordem de registro, inclusive as removidas.
  series: SerieExecutada[];
}

// Ficha, versão e rotina vazias = treino livre (SL18). A versão é a usada na época (RB04).
export interface Sessao {
  id: Identificador;
  inicio: InstanteUtc;
  fim: InstanteUtc | null;
  fichaId: Identificador | null;
  versaoId: Identificador | null;
  rotinaId: Identificador | null;
  situacao: SituacaoDaSessao;
  observacao: string | null;
  exercicios: ExercicioDaSessao[];
}

export type NovaSessao = Omit<Sessao, 'exercicios'>;
export type NovoExercicioDaSessao = Omit<ExercicioDaSessao, 'series'>;
