import type { RepositorioDeSessoes } from '../../src/aplicacao/portas/repositorio-de-sessoes';
import { Carga } from '../../src/dominio/carga';
import { Identificador } from '../../src/dominio/identificador';
import { InstanteUtc } from '../../src/dominio/instante-utc';
import type { SerieDoHistorico, SerieExecutada } from '../../src/dominio/sessao';

// Faixa própria de identificadores, um contador só para todos os testes do histórico.
let proximo = 0xd00;

export function novoId(): Identificador {
  const sufixo = (proximo++).toString(16).padStart(12, '0');
  return Identificador.de(`00000000-0000-7000-8000-${sufixo}`);
}

export function serieDeTrabalho(cargaEmQuilos: number): SerieExecutada {
  return {
    id: novoId(),
    tipo: 'trabalho',
    carga: Carga.deQuilos(cargaEmQuilos),
    repeticoes: 10,
    repeticoesOutroLado: null,
    segundos: null,
    segundosOutroLado: null,
    rir: 2,
    tecnica: null,
    concluidaEm: InstanteUtc.de('2026-11-12T09:05:00.000Z'),
    removidaEm: null,
  };
}

// Grava uma sessão de treino livre com um exercício e as séries dadas, pela porta.
export async function registrarSessao(
  sessoes: RepositorioDeSessoes,
  exercicioId: Identificador,
  inicio: string,
  series: SerieExecutada[],
): Promise<{ sessaoId: Identificador }> {
  const sessaoId = novoId();
  await sessoes.iniciarSessao({
    id: sessaoId,
    inicio: InstanteUtc.de(inicio),
    fim: null,
    fichaId: null,
    versaoId: null,
    rotinaId: null,
    situacao: 'concluida',
    observacao: null,
  });
  const exercicioDaSessaoId = novoId();
  await sessoes.adicionarExercicio(sessaoId, {
    id: exercicioDaSessaoId,
    exercicioId,
    itemOrigemId: null,
    observacoes: null,
  });
  for (const serie of series) await sessoes.registrarSerie(exercicioDaSessaoId, serie);
  return { sessaoId };
}

export const idsDasSeries = (itens: SerieDoHistorico[]): string[] =>
  itens.map((item) => item.serie.id.valor);
