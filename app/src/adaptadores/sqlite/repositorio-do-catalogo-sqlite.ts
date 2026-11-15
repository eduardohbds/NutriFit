import { eq } from 'drizzle-orm';
import type { BaseSQLiteDatabase } from 'drizzle-orm/sqlite-core';

import type {
  OpcaoDeRemocao,
  RepositorioDoCatalogo,
  SituacaoDaFichaNoCatalogo,
  SituacaoDoExercicio,
} from '../../aplicacao/portas/repositorio-do-catalogo';
import { ErroDeValidacao } from '../../dominio/erro-de-validacao';
import type { Identificador } from '../../dominio/identificador';
import {
  exercicio,
  exercicioGrupo,
  exercicioSessao,
  exercicioSinonimo,
  ficha,
  item,
} from './esquema';

type BancoDrizzle = BaseSQLiteDatabase<'sync', unknown>;
type Consultor = Pick<BancoDrizzle, 'select'>;

export class RepositorioDoCatalogoSqlite implements RepositorioDoCatalogo {
  constructor(private readonly banco: BancoDrizzle) {}

  async situacaoDoExercicio(id: Identificador): Promise<SituacaoDoExercicio | null> {
    const linha = this.banco
      .select({ situacao: exercicio.situacao })
      .from(exercicio)
      .where(eq(exercicio.id, id.valor))
      .get();
    return (linha?.situacao as SituacaoDoExercicio | undefined) ?? null;
  }

  async opcoesDeRemocaoDoExercicio(id: Identificador): Promise<OpcaoDeRemocao[]> {
    exigirExercicio(this.banco, id);
    return temHistorico(this.banco, id) ? ['arquivar'] : ['arquivar', 'excluir'];
  }

  async arquivarExercicio(id: Identificador): Promise<void> {
    exigirExercicio(this.banco, id);
    this.banco
      .update(exercicio)
      .set({ situacao: 'arquivado' })
      .where(eq(exercicio.id, id.valor))
      .run();
  }

  async excluirExercicio(id: Identificador): Promise<void> {
    this.banco.transaction((tx) => {
      exigirExercicio(tx, id);
      if (temHistorico(tx, id))
        throw new ErroDeValidacao('exercicio', 'exercício sem histórico', id.valor);
      tx.delete(exercicioGrupo).where(eq(exercicioGrupo.exercicioId, id.valor)).run();
      tx.delete(exercicioSinonimo).where(eq(exercicioSinonimo.exercicioId, id.valor)).run();
      tx.delete(exercicio).where(eq(exercicio.id, id.valor)).run();
    });
  }

  async situacaoDaFicha(id: Identificador): Promise<SituacaoDaFichaNoCatalogo | null> {
    const linha = this.banco
      .select({ situacao: ficha.situacao })
      .from(ficha)
      .where(eq(ficha.id, id.valor))
      .get();
    return (linha?.situacao as SituacaoDaFichaNoCatalogo | undefined) ?? null;
  }

  // Excluir uma ficha apagaria versões, que só recebem inserção (RB02).
  async opcoesDeRemocaoDaFicha(): Promise<OpcaoDeRemocao[]> {
    return ['arquivar'];
  }

  async arquivarFicha(id: Identificador): Promise<void> {
    if ((await this.situacaoDaFicha(id)) === null)
      throw new ErroDeValidacao('ficha', 'ficha existente', id.valor);
    this.banco.update(ficha).set({ situacao: 'arquivada' }).where(eq(ficha.id, id.valor)).run();
  }
}

function exigirExercicio(banco: Consultor, id: Identificador): void {
  const linha = banco
    .select({ id: exercicio.id })
    .from(exercicio)
    .where(eq(exercicio.id, id.valor))
    .get();
  if (!linha) throw new ErroDeValidacao('exercicio', 'exercício existente', id.valor);
}

// Histórico = o exercício é item de alguma versão de ficha ou consta em alguma sessão.
function temHistorico(banco: Consultor, id: Identificador): boolean {
  const emFicha = banco
    .select({ id: item.id })
    .from(item)
    .where(eq(item.exercicioId, id.valor))
    .limit(1)
    .get();
  const emSessao = banco
    .select({ id: exercicioSessao.id })
    .from(exercicioSessao)
    .where(eq(exercicioSessao.exercicioId, id.valor))
    .limit(1)
    .get();
  return Boolean(emFicha || emSessao);
}
