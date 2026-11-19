import { eq } from 'drizzle-orm';
import type { BaseSQLiteDatabase } from 'drizzle-orm/sqlite-core';

import type { GeradorDeIdentificador } from '../../aplicacao/portas/gerador-de-identificador';
import type {
  OpcaoDeRemocao,
  RepositorioDoCatalogo,
  SituacaoDaFichaNoCatalogo,
} from '../../aplicacao/portas/repositorio-do-catalogo';
import type {
  ExercicioDoCatalogo,
  GruposDoExercicio,
  NovoExercicio,
  OrigemDoExercicio,
  SituacaoDoExercicio,
} from '../../dominio/exercicio';
import { ErroDeValidacao } from '../../dominio/erro-de-validacao';
import { Identificador } from '../../dominio/identificador';
import {
  exercicio,
  exercicioGrupo,
  exercicioSessao,
  exercicioSinonimo,
  ficha,
  grupoMuscular,
  item,
} from './esquema';
import { GeradorUuidV7 } from '../sistema/gerador-uuid-v7';

type BancoDrizzle = BaseSQLiteDatabase<'sync', unknown>;
type Consultor = Pick<BancoDrizzle, 'select'>;
type Gravador = Pick<BancoDrizzle, 'select' | 'insert'>;

export class RepositorioDoCatalogoSqlite implements RepositorioDoCatalogo {
  constructor(
    private readonly banco: BancoDrizzle,
    private readonly gerador: GeradorDeIdentificador = new GeradorUuidV7(),
  ) {}

  async listarExercicios(): Promise<ExercicioDoCatalogo[]> {
    const gruposPorExercicio = agrupar(
      this.banco
        .select({
          chave: exercicioGrupo.exercicioId,
          nome: grupoMuscular.nome,
          papel: exercicioGrupo.papel,
        })
        .from(exercicioGrupo)
        .innerJoin(grupoMuscular, eq(grupoMuscular.id, exercicioGrupo.grupoId))
        .all(),
    );
    const sinonimosPorExercicio = agrupar(
      this.banco
        .select({ chave: exercicioSinonimo.exercicioId, nome: exercicioSinonimo.texto })
        .from(exercicioSinonimo)
        .all(),
    );
    return this.banco
      .select()
      .from(exercicio)
      .all()
      .map((linha) => ({
        id: Identificador.de(linha.id),
        nome: linha.nome,
        situacao: linha.situacao as SituacaoDoExercicio,
        origem: linha.origem as OrigemDoExercicio,
        unilateral: linha.unilateral,
        equipamento: linha.equipamento,
        sinonimos: (sinonimosPorExercicio.get(linha.id) ?? []).map((g) => g.nome),
        gruposDiretos: nomesDoPapel(gruposPorExercicio.get(linha.id), 'direto'),
        gruposIndiretos: nomesDoPapel(gruposPorExercicio.get(linha.id), 'indireto'),
      }));
  }

  async gravarGrupos(id: Identificador, grupos: GruposDoExercicio): Promise<void> {
    this.banco.transaction((tx) => {
      exigirExercicio(tx, id);
      tx.delete(exercicioGrupo).where(eq(exercicioGrupo.exercicioId, id.valor)).run();
      this.inserirGrupos(tx, id, grupos);
    });
  }

  // A transação de quem chama desfaz tudo se um nome não está na lista fixa.
  private inserirGrupos(tx: Gravador, id: Identificador, grupos: GruposDoExercicio): void {
    const novos = [
      ...grupos.diretos.map((nome) => ({ nome, papel: 'direto' as const })),
      ...grupos.indiretos.map((nome) => ({ nome, papel: 'indireto' as const })),
    ].map(({ nome, papel }) => ({
      id: this.gerador.gerar().valor,
      exercicioId: id.valor,
      grupoId: idDoGrupo(tx, nome),
      papel,
    }));
    if (novos.length > 0) tx.insert(exercicioGrupo).values(novos).run();
  }

  async criarExercicio(novo: NovoExercicio): Promise<void> {
    this.banco.transaction((tx) => {
      tx.insert(exercicio)
        .values({
          id: novo.id.valor,
          nome: novo.nome,
          situacao: 'ativo',
          origem: 'usuario',
          unilateral: novo.unilateral,
          equipamento: novo.equipamento,
        })
        .run();
      this.inserirGrupos(tx, novo.id, novo.grupos);
    });
  }

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

interface LinhaDoExercicio {
  chave: string;
  nome: string;
  papel?: string;
}

function agrupar(linhas: LinhaDoExercicio[]): Map<string, LinhaDoExercicio[]> {
  const porChave = new Map<string, LinhaDoExercicio[]>();
  for (const linha of linhas)
    porChave.set(linha.chave, [...(porChave.get(linha.chave) ?? []), linha]);
  return porChave;
}

function nomesDoPapel(linhas: LinhaDoExercicio[] | undefined, papel: string): string[] {
  return (linhas ?? []).filter((l) => l.papel === papel).map((l) => l.nome);
}

// A transação desfaz tudo se um nome não está na lista fixa (a tabela é a dos 16 grupos da 0001).
function idDoGrupo(banco: Consultor, nome: string): string {
  const linha = banco
    .select({ id: grupoMuscular.id })
    .from(grupoMuscular)
    .where(eq(grupoMuscular.nome, nome))
    .get();
  if (!linha) throw new ErroDeValidacao('grupo', 'um dos 16 grupos da lista fixa', nome);
  return linha.id;
}
