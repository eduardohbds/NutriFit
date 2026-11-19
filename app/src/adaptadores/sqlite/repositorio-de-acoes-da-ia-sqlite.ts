import { eq } from 'drizzle-orm';
import type { BaseSQLiteDatabase } from 'drizzle-orm/sqlite-core';

import type { RepositorioDeAcoesDaIA } from '../../aplicacao/portas/repositorio-de-acoes-da-ia';
import type { AcaoDaIA } from '../../dominio/acao-da-ia';
import { ErroDeValidacao } from '../../dominio/erro-de-validacao';
import { Identificador } from '../../dominio/identificador';
import { InstanteUtc } from '../../dominio/instante-utc';
import { acaoIa } from './esquema';

type BancoDrizzle = BaseSQLiteDatabase<'sync', unknown>;

export class RepositorioDeAcoesDaIASqlite implements RepositorioDeAcoesDaIA {
  constructor(private readonly banco: BancoDrizzle) {}

  async registrar(acao: AcaoDaIA): Promise<void> {
    this.banco
      .insert(acaoIa)
      .values({
        id: acao.id.valor,
        comando: acao.comando,
        criadaEm: acao.criadaEm.iso,
        tipo: acao.tipo,
        resultado: acao.resultado,
        versaoCriadaId: acao.versaoCriadaId?.valor ?? null,
        resumo: acao.resumo,
        desfeita: acao.desfeita,
      })
      .run();
  }

  // Só a marca muda (FL04): o UPDATE não toca em nenhuma outra coluna. O resultado de `run()` não
  // traz a contagem de linhas neste tipo de banco, então a existência é conferida antes.
  async desfazer(id: Identificador): Promise<void> {
    this.banco.transaction((tx) => {
      const [existente] = tx.select().from(acaoIa).where(eq(acaoIa.id, id.valor)).all();
      if (!existente) throw new ErroDeValidacao('ação da IA', 'ação existente', id.valor);
      tx.update(acaoIa).set({ desfeita: true }).where(eq(acaoIa.id, id.valor)).run();
    });
  }

  async buscar(id: Identificador): Promise<AcaoDaIA | null> {
    const [linha] = this.banco.select().from(acaoIa).where(eq(acaoIa.id, id.valor)).all();
    if (!linha) return null;
    return {
      id: Identificador.de(linha.id),
      comando: linha.comando,
      criadaEm: InstanteUtc.de(linha.criadaEm),
      tipo: linha.tipo,
      resultado: linha.resultado,
      versaoCriadaId: linha.versaoCriadaId ? Identificador.de(linha.versaoCriadaId) : null,
      resumo: linha.resumo,
      desfeita: linha.desfeita,
    };
  }
}
