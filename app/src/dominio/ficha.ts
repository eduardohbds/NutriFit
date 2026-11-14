import type { Carga } from './carga';
import type { Identificador } from './identificador';
import type { InstanteUtc } from './instante-utc';

// Tipos mínimos para guardar uma versão com o conteúdo inteiro (US-002a). As regras de meta, RIR e
// técnica entram nas US-007 e US-008, e por isso aqui os campos ainda são dados sem validação.
export type SituacaoDaFicha = 'ativa' | 'inativa' | 'arquivada';
export type OrigemDaFicha = 'manual' | 'importada' | 'ia' | 'duplicada';
export type AutorDaVersao = 'usuario' | 'ia' | 'importacao';
export type TipoDeMeta = 'repeticoes' | 'faixa' | 'falha' | 'tempo';

export interface SeriePlanejada {
  id: Identificador;
  meta: { tipo: TipoDeMeta; minimo: number | null; maximo: number | null; segundos: number | null };
  carga: Carga | null;
  tecnica: string | null;
  descansoSegundos: number | null;
}

export interface ItemDaRotina {
  id: Identificador;
  exercicioId: Identificador;
  grupoSequencia: string | null;
  unilateral: boolean;
  travado: boolean;
  observacoes: string | null;
  series: SeriePlanejada[];
}

export interface Rotina {
  id: Identificador;
  nome: string;
  diaDaSemana: number | null;
  itens: ItemDaRotina[];
}

export interface Ficha {
  id: Identificador;
  nome: string;
  situacao: SituacaoDaFicha;
  origem: OrigemDaFicha;
  criadaEm: InstanteUtc;
}

// A ordem das rotinas, dos itens e das séries na lista é a posição delas na versão.
export interface VersaoDaFicha {
  id: Identificador;
  fichaId: Identificador;
  numero: number;
  autor: AutorDaVersao;
  criadaEm: InstanteUtc;
  motivo: string | null;
  resumo: string | null;
  rotinas: Rotina[];
}

// O número e a ficha são do repositório: ele dá o número seguinte dentro da gravação.
export type NovaVersaoDaFicha = Omit<VersaoDaFicha, 'numero' | 'fichaId'>;
