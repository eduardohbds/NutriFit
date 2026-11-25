import { Carga } from '../../src/dominio/carga';
import type { ItemDaRotina, SeriePlanejada, VersaoDaFicha } from '../../src/dominio/ficha';
import { Identificador } from '../../src/dominio/identificador';
import { InstanteUtc } from '../../src/dominio/instante-utc';
import { GeradorDeIdentificadorSequencial } from '../dubles/gerador-de-identificador-sequencial';

export const SUPINO = Identificador.de('00000000-0000-7000-8000-0000000d1001');
export const REMADA = Identificador.de('00000000-0000-7000-8000-0000000d1002');
export const AGACHAMENTO = Identificador.de('00000000-0000-7000-8000-0000000d1003');

const gerador = new GeradorDeIdentificadorSequencial();

export interface LinhaDeExemplo {
  exercicio: Identificador;
  series?: number;
  meta?: number;
  cargaEmQuilos?: number | null;
  tecnica?: string | null;
  descanso?: number | null;
  grupo?: string | null;
  unilateral?: boolean;
  observacoes?: string | null;
}

function serie(linha: LinhaDeExemplo): SeriePlanejada {
  return {
    id: gerador.gerar(),
    meta: { tipo: 'repeticoes', minimo: linha.meta ?? 10, maximo: null, segundos: null },
    carga: linha.cargaEmQuilos == null ? null : Carga.deQuilos(linha.cargaEmQuilos),
    tecnica: linha.tecnica ?? null,
    descansoSegundos: linha.descanso ?? null,
  };
}

function item(linha: LinhaDeExemplo): ItemDaRotina {
  return {
    id: gerador.gerar(),
    exercicioId: linha.exercicio,
    grupoSequencia: linha.grupo ?? null,
    unilateral: linha.unilateral ?? false,
    travado: false,
    observacoes: linha.observacoes ?? null,
    series: Array.from({ length: linha.series ?? 3 }, () => serie(linha)),
  };
}

export interface RotinaDeExemplo {
  nome: string;
  dia?: number | null;
  linhas: LinhaDeExemplo[];
}

// Versão com identificadores novos a cada chamada, só para comparar conteúdo.
export function versaoDeExemplo(numero: number, rotinas: RotinaDeExemplo[]): VersaoDaFicha {
  return {
    id: gerador.gerar(),
    fichaId: Identificador.de('00000000-0000-7000-8000-0000000d1000'),
    numero,
    autor: 'usuario',
    criadaEm: InstanteUtc.de('2026-11-10T13:45:00.000Z'),
    motivo: null,
    resumo: null,
    rotinas: rotinas.map((r) => ({
      id: gerador.gerar(),
      nome: r.nome,
      diaDaSemana: r.dia ?? null,
      itens: r.linhas.map(item),
    })),
  };
}
