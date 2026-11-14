import { and, asc, eq, max } from 'drizzle-orm';
import type { BaseSQLiteDatabase } from 'drizzle-orm/sqlite-core';

import type { RepositorioDeFichas } from '../../aplicacao/portas/repositorio-de-fichas';
import { Carga } from '../../dominio/carga';
import { ErroDeValidacao } from '../../dominio/erro-de-validacao';
import type {
  Ficha,
  ItemDaRotina,
  NovaVersaoDaFicha,
  Rotina,
  SeriePlanejada,
  VersaoDaFicha,
} from '../../dominio/ficha';
import { Identificador } from '../../dominio/identificador';
import { InstanteUtc } from '../../dominio/instante-utc';
import { ficha, item, rotina, seriePlanejada, versaoFicha } from './esquema';

type BancoDrizzle = BaseSQLiteDatabase<'sync', unknown>;
// A transação do Drizzle aceita as mesmas consultas do banco.
type Gravador = Pick<BancoDrizzle, 'insert' | 'select'>;

export class RepositorioDeFichasSqlite implements RepositorioDeFichas {
  constructor(private readonly banco: BancoDrizzle) {}

  async criarFicha(nova: Ficha, primeiraVersao: NovaVersaoDaFicha): Promise<VersaoDaFicha> {
    this.banco.transaction((tx) => {
      tx.insert(ficha)
        .values({
          id: nova.id.valor,
          nome: nova.nome,
          situacao: nova.situacao,
          origem: nova.origem,
          criadaEm: nova.criadaEm.iso,
        })
        .run();
      gravarVersao(tx, nova.id, 1, primeiraVersao);
    });
    return this.versaoDeNumero(nova.id, 1);
  }

  async salvarNovaVersao(
    fichaId: Identificador,
    versao: NovaVersaoDaFicha,
  ): Promise<VersaoDaFicha> {
    const numero = this.banco.transaction((tx) => {
      if (!existeFicha(tx, fichaId))
        throw new ErroDeValidacao('ficha', 'ficha existente', fichaId.valor);
      const proximo = (ultimoNumero(tx, fichaId) ?? 0) + 1;
      gravarVersao(tx, fichaId, proximo, versao);
      return proximo;
    });
    return this.versaoDeNumero(fichaId, numero);
  }

  async listarVersoes(fichaId: Identificador): Promise<VersaoDaFicha[]> {
    const linhas = this.banco
      .select()
      .from(versaoFicha)
      .where(eq(versaoFicha.fichaId, fichaId.valor))
      .orderBy(asc(versaoFicha.numero))
      .all();
    return linhas.map((linha) => lerVersao(this.banco, linha));
  }

  async buscarVersaoAtual(fichaId: Identificador): Promise<VersaoDaFicha | null> {
    const numero = ultimoNumero(this.banco, fichaId);
    return numero === null ? null : this.versaoDeNumero(fichaId, numero);
  }

  private async versaoDeNumero(fichaId: Identificador, numero: number): Promise<VersaoDaFicha> {
    const [linha] = this.banco
      .select()
      .from(versaoFicha)
      .where(and(eq(versaoFicha.fichaId, fichaId.valor), eq(versaoFicha.numero, numero)))
      .all();
    return lerVersao(this.banco, linha);
  }
}

function existeFicha(banco: Gravador, fichaId: Identificador): boolean {
  return banco.select().from(ficha).where(eq(ficha.id, fichaId.valor)).all().length > 0;
}

function ultimoNumero(banco: Gravador, fichaId: Identificador): number | null {
  const [linha] = banco
    .select({ numero: max(versaoFicha.numero) })
    .from(versaoFicha)
    .where(eq(versaoFicha.fichaId, fichaId.valor))
    .all();
  return linha?.numero ?? null;
}

// Só INSERT: versão, rotinas, itens e séries nunca são atualizados nem apagados (RB02).
function gravarVersao(
  tx: Gravador,
  fichaId: Identificador,
  numero: number,
  versao: NovaVersaoDaFicha,
) {
  tx.insert(versaoFicha)
    .values({
      id: versao.id.valor,
      fichaId: fichaId.valor,
      numero,
      autor: versao.autor,
      criadaEm: versao.criadaEm.iso,
      motivo: versao.motivo,
      resumo: versao.resumo,
    })
    .run();
  versao.rotinas.forEach((r, posicao) => gravarRotina(tx, versao.id, r, posicao + 1));
}

function gravarRotina(tx: Gravador, versaoId: Identificador, r: Rotina, posicao: number) {
  tx.insert(rotina)
    .values({
      id: r.id.valor,
      versaoId: versaoId.valor,
      nome: r.nome,
      diaSemana: r.diaDaSemana,
      posicao,
    })
    .run();
  r.itens.forEach((i, posicaoDoItem) => gravarItem(tx, r.id, i, posicaoDoItem + 1));
}

function gravarItem(tx: Gravador, rotinaId: Identificador, i: ItemDaRotina, posicao: number) {
  tx.insert(item)
    .values({
      id: i.id.valor,
      rotinaId: rotinaId.valor,
      exercicioId: i.exercicioId.valor,
      posicao,
      grupoSequencia: i.grupoSequencia,
      unilateral: i.unilateral,
      travado: i.travado,
      observacoes: i.observacoes,
    })
    .run();
  i.series.forEach((s, posicaoDaSerie) => gravarSerie(tx, i.id, s, posicaoDaSerie + 1));
}

function gravarSerie(tx: Gravador, itemId: Identificador, s: SeriePlanejada, posicao: number) {
  tx.insert(seriePlanejada)
    .values({
      id: s.id.valor,
      itemId: itemId.valor,
      posicao,
      metaTipo: s.meta.tipo,
      metaMinimo: s.meta.minimo,
      metaMaximo: s.meta.maximo,
      metaSegundos: s.meta.segundos,
      cargaGramas: s.carga?.gramas ?? null,
      tecnica: s.tecnica,
      descansoSegundos: s.descansoSegundos,
    })
    .run();
}

type LinhaDaVersao = typeof versaoFicha.$inferSelect;

function lerVersao(banco: Gravador, linha: LinhaDaVersao): VersaoDaFicha {
  const rotinas = banco
    .select()
    .from(rotina)
    .where(eq(rotina.versaoId, linha.id))
    .orderBy(asc(rotina.posicao))
    .all();
  return {
    id: Identificador.de(linha.id),
    fichaId: Identificador.de(linha.fichaId),
    numero: linha.numero,
    autor: linha.autor as VersaoDaFicha['autor'],
    criadaEm: InstanteUtc.de(linha.criadaEm),
    motivo: linha.motivo,
    resumo: linha.resumo,
    rotinas: rotinas.map((r) => lerRotina(banco, r)),
  };
}

function lerRotina(banco: Gravador, linha: typeof rotina.$inferSelect): Rotina {
  const itens = banco
    .select()
    .from(item)
    .where(eq(item.rotinaId, linha.id))
    .orderBy(asc(item.posicao))
    .all();
  return {
    id: Identificador.de(linha.id),
    nome: linha.nome,
    diaDaSemana: linha.diaSemana,
    itens: itens.map((i) => lerItem(banco, i)),
  };
}

function lerItem(banco: Gravador, linha: typeof item.$inferSelect): ItemDaRotina {
  const series = banco
    .select()
    .from(seriePlanejada)
    .where(eq(seriePlanejada.itemId, linha.id))
    .orderBy(asc(seriePlanejada.posicao))
    .all();
  return {
    id: Identificador.de(linha.id),
    exercicioId: Identificador.de(linha.exercicioId),
    grupoSequencia: linha.grupoSequencia,
    unilateral: linha.unilateral,
    travado: linha.travado,
    observacoes: linha.observacoes,
    series: series.map(lerSerie),
  };
}

function lerSerie(linha: typeof seriePlanejada.$inferSelect): SeriePlanejada {
  return {
    id: Identificador.de(linha.id),
    meta: {
      tipo: linha.metaTipo as SeriePlanejada['meta']['tipo'],
      minimo: linha.metaMinimo,
      maximo: linha.metaMaximo,
      segundos: linha.metaSegundos,
    },
    carga: linha.cargaGramas === null ? null : Carga.deGramas(linha.cargaGramas),
    tecnica: linha.tecnica,
    descansoSegundos: linha.descansoSegundos,
  };
}
