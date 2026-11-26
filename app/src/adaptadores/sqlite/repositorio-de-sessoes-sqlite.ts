import { and, asc, desc, eq, inArray, isNotNull, isNull, max, sql } from 'drizzle-orm';
import type { BaseSQLiteDatabase } from 'drizzle-orm/sqlite-core';

import type { RepositorioDeSessoes } from '../../aplicacao/portas/repositorio-de-sessoes';
import { Carga } from '../../dominio/carga';
import { ErroDeEspacoInsuficiente } from '../../dominio/erro-de-espaco-insuficiente';
import { ErroDeValidacao } from '../../dominio/erro-de-validacao';
import { Identificador } from '../../dominio/identificador';
import { InstanteUtc } from '../../dominio/instante-utc';
import type {
  ExercicioDaSessao,
  NovaSessao,
  NovoExercicioDaSessao,
  SerieDoHistorico,
  SerieExecutada,
  Sessao,
} from '../../dominio/sessao';
import { exercicioSessao, serieExecutada, sessao } from './esquema';

type BancoDrizzle = BaseSQLiteDatabase<'sync', unknown>;
// A transação do Drizzle aceita as mesmas consultas do banco.
type Gravador = Pick<BancoDrizzle, 'insert' | 'select' | 'update'>;

export class RepositorioDeSessoesSqlite implements RepositorioDeSessoes {
  constructor(private readonly banco: BancoDrizzle) {}

  async iniciarSessao(nova: NovaSessao): Promise<void> {
    this.banco
      .insert(sessao)
      .values({
        id: nova.id.valor,
        inicio: nova.inicio.iso,
        fim: nova.fim?.iso ?? null,
        fichaId: nova.fichaId?.valor ?? null,
        versaoId: nova.versaoId?.valor ?? null,
        rotinaId: nova.rotinaId?.valor ?? null,
        situacao: nova.situacao,
        observacao: nova.observacao,
      })
      .run();
  }

  async adicionarExercicio(
    sessaoId: Identificador,
    exercicio: NovoExercicioDaSessao,
  ): Promise<void> {
    this.banco.transaction((tx) => {
      const [existente] = tx.select().from(sessao).where(eq(sessao.id, sessaoId.valor)).all();
      if (!existente) throw new ErroDeValidacao('sessão', 'sessão existente', sessaoId.valor);
      const [ultimo] = tx
        .select({ posicao: max(exercicioSessao.posicao) })
        .from(exercicioSessao)
        .where(eq(exercicioSessao.sessaoId, sessaoId.valor))
        .all();
      tx.insert(exercicioSessao)
        .values({
          id: exercicio.id.valor,
          sessaoId: sessaoId.valor,
          exercicioId: exercicio.exercicioId.valor,
          itemOrigemId: exercicio.itemOrigemId?.valor ?? null,
          posicao: (ultimo?.posicao ?? 0) + 1,
          observacoes: exercicio.observacoes,
        })
        .run();
    });
  }

  async registrarSerie(exercicioDaSessaoId: Identificador, serie: SerieExecutada): Promise<void> {
    try {
      this.gravarSerie(exercicioDaSessaoId, serie);
    } catch (erro) {
      throw ehFaltaDeEspaco(erro) ? new ErroDeEspacoInsuficiente() : erro;
    }
  }

  private gravarSerie(exercicioDaSessaoId: Identificador, serie: SerieExecutada): void {
    this.banco.transaction((tx) => {
      const [existente] = tx
        .select()
        .from(exercicioSessao)
        .where(eq(exercicioSessao.id, exercicioDaSessaoId.valor))
        .all();
      if (!existente) {
        throw new ErroDeValidacao(
          'exercício da sessão',
          'exercício da sessão existente',
          exercicioDaSessaoId.valor,
        );
      }
      const [ultima] = tx
        .select({ posicao: max(serieExecutada.posicao) })
        .from(serieExecutada)
        .where(eq(serieExecutada.exercicioSessaoId, exercicioDaSessaoId.valor))
        .all();
      inserirSerie(tx, exercicioDaSessaoId, (ultima?.posicao ?? 0) + 1, serie);
    });
  }

  // O único UPDATE do repositório é a marca removida_em; a série corrigida é uma linha nova.
  async corrigirSerie(
    serieId: Identificador,
    corrigida: SerieExecutada,
    em: InstanteUtc,
  ): Promise<void> {
    this.banco.transaction((tx) => {
      const [antiga] = tx
        .select()
        .from(serieExecutada)
        .where(and(eq(serieExecutada.id, serieId.valor), isNull(serieExecutada.removidaEm)))
        .all();
      if (!antiga) throw new ErroDeValidacao('série', 'série ativa existente', serieId.valor);
      tx.update(serieExecutada)
        .set({ removidaEm: em.iso })
        .where(eq(serieExecutada.id, serieId.valor))
        .run();
      inserirSerie(tx, Identificador.de(antiga.exercicioSessaoId), antiga.posicao, corrigida);
    });
  }

  async seriesDosExercicios(exercicioIds: Identificador[]): Promise<SerieDoHistorico[]> {
    if (exercicioIds.length === 0) return [];
    const ids = exercicioIds.map((id) => id.valor);
    // Série corrigida divide a posição com a antiga; o rowid da própria tabela mantém a ordem.
    const linhas = this.banco
      .select({
        sessaoId: sessao.id,
        exercicioId: exercicioSessao.exercicioId,
        serie: serieExecutada,
      })
      .from(serieExecutada)
      .innerJoin(exercicioSessao, eq(serieExecutada.exercicioSessaoId, exercicioSessao.id))
      .innerJoin(sessao, eq(exercicioSessao.sessaoId, sessao.id))
      .where(and(inArray(exercicioSessao.exercicioId, ids), isNull(serieExecutada.removidaEm)))
      .orderBy(
        asc(sessao.inicio),
        asc(exercicioSessao.posicao),
        asc(serieExecutada.posicao),
        sql`${serieExecutada}.rowid`,
      )
      .all();
    return linhas.map((linha) => ({
      sessaoId: Identificador.de(linha.sessaoId),
      exercicioId: Identificador.de(linha.exercicioId),
      serie: lerSerie(linha.serie),
    }));
  }

  // Só leitura (FI-4). A de maior fim; o rowid desempata pela ordem de gravação.
  async ultimaRotinaConcluida(fichaId: Identificador): Promise<Identificador | null> {
    const linha = this.banco
      .select({ rotinaId: sessao.rotinaId })
      .from(sessao)
      .where(
        and(
          eq(sessao.fichaId, fichaId.valor),
          eq(sessao.situacao, 'concluida'),
          isNotNull(sessao.rotinaId),
          isNotNull(sessao.fim),
        ),
      )
      .orderBy(desc(sessao.fim), sql`${sessao}.rowid DESC`)
      .limit(1)
      .get();
    return linha?.rotinaId ? Identificador.de(linha.rotinaId) : null;
  }

  async buscarSessao(id: Identificador): Promise<Sessao | null> {
    const [linha] = this.banco.select().from(sessao).where(eq(sessao.id, id.valor)).all();
    if (!linha) return null;
    const exercicios = this.banco
      .select()
      .from(exercicioSessao)
      .where(eq(exercicioSessao.sessaoId, id.valor))
      .orderBy(asc(exercicioSessao.posicao))
      .all();
    return montarSessao(
      linha,
      exercicios.map((e) => this.lerExercicio(e)),
    );
  }

  private lerExercicio(linha: typeof exercicioSessao.$inferSelect): ExercicioDaSessao {
    // Série corrigida divide a posição com a antiga; o rowid mantém a ordem de registro.
    const series = this.banco
      .select()
      .from(serieExecutada)
      .where(eq(serieExecutada.exercicioSessaoId, linha.id))
      .orderBy(asc(serieExecutada.posicao), sql`rowid`)
      .all();
    return {
      id: Identificador.de(linha.id),
      exercicioId: Identificador.de(linha.exercicioId),
      itemOrigemId: identificadorOuNulo(linha.itemOrigemId),
      observacoes: linha.observacoes,
      series: series.map(lerSerie),
    };
  }
}

function montarSessao(linha: typeof sessao.$inferSelect, exercicios: ExercicioDaSessao[]): Sessao {
  return {
    id: Identificador.de(linha.id),
    inicio: InstanteUtc.de(linha.inicio),
    fim: linha.fim === null ? null : InstanteUtc.de(linha.fim),
    fichaId: identificadorOuNulo(linha.fichaId),
    versaoId: identificadorOuNulo(linha.versaoId),
    rotinaId: identificadorOuNulo(linha.rotinaId),
    situacao: linha.situacao as Sessao['situacao'],
    observacao: linha.observacao,
    exercicios,
  };
}

// better-sqlite3 traz o código SQLITE_FULL; o expo-sqlite, no aparelho, só a mensagem (N6).
const SEM_ESPACO = /SQLITE_FULL|database or disk is full/i;

function ehFaltaDeEspaco(erro: unknown): boolean {
  const { code, message } = (erro ?? {}) as { code?: unknown; message?: unknown };
  return SEM_ESPACO.test(String(code ?? '')) || SEM_ESPACO.test(String(message ?? ''));
}

function identificadorOuNulo(valor: string | null): Identificador | null {
  return valor === null ? null : Identificador.de(valor);
}

function inserirSerie(
  tx: Gravador,
  exercicioDaSessaoId: Identificador,
  posicao: number,
  s: SerieExecutada,
) {
  tx.insert(serieExecutada)
    .values({
      id: s.id.valor,
      exercicioSessaoId: exercicioDaSessaoId.valor,
      posicao,
      tipo: s.tipo,
      cargaGramas: s.carga?.gramas ?? null,
      repeticoes: s.repeticoes,
      repeticoesOutroLado: s.repeticoesOutroLado,
      segundos: s.segundos,
      segundosOutroLado: s.segundosOutroLado,
      rir: s.rir,
      tecnica: s.tecnica,
      concluidaEm: s.concluidaEm.iso,
      removidaEm: s.removidaEm?.iso ?? null,
    })
    .run();
}

function lerSerie(linha: typeof serieExecutada.$inferSelect): SerieExecutada {
  return {
    id: Identificador.de(linha.id),
    tipo: linha.tipo as SerieExecutada['tipo'],
    carga: linha.cargaGramas === null ? null : Carga.deGramas(linha.cargaGramas),
    repeticoes: linha.repeticoes,
    repeticoesOutroLado: linha.repeticoesOutroLado,
    segundos: linha.segundos,
    segundosOutroLado: linha.segundosOutroLado,
    rir: linha.rir,
    tecnica: linha.tecnica,
    concluidaEm: InstanteUtc.de(linha.concluidaEm),
    removidaEm: linha.removidaEm === null ? null : InstanteUtc.de(linha.removidaEm),
  };
}
