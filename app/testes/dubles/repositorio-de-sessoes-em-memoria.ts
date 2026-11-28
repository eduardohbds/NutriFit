import type { RepositorioDeSessoes } from '../../src/aplicacao/portas/repositorio-de-sessoes';
import { ErroDeValidacao } from '../../src/dominio/erro-de-validacao';
import type { Identificador } from '../../src/dominio/identificador';
import type { InstanteUtc } from '../../src/dominio/instante-utc';
import type {
  ExercicioDaSessao,
  NovaSessao,
  NovoExercicioDaSessao,
  SerieDoHistorico,
  SerieExecutada,
  Sessao,
  SituacaoEncerrada,
} from '../../src/dominio/sessao';

// Cópia na entrada e na saída: quem recebe um objeto não consegue alterar o que está guardado.
// Identificador, Carga e InstanteUtc são imutáveis e podem ser compartilhados.
function copiar(sessao: Sessao): Sessao {
  return {
    ...sessao,
    exercicios: sessao.exercicios.map((e) => ({ ...e, series: e.series.map((s) => ({ ...s })) })),
  };
}

function porInicio(a: Sessao, b: Sessao): number {
  if (a.inicio.iso === b.inicio.iso) return 0;
  return a.inicio.iso < b.inicio.iso ? -1 : 1;
}

// Só as séries ativas dos exercícios pedidos, cada uma com a sessão e o exercício de origem.
function seriesDaSessao(sessao: Sessao, pedidos: Set<string>): SerieDoHistorico[] {
  if (sessao.situacao === 'descartada') return [];
  const doPedido = sessao.exercicios.filter((e) => pedidos.has(e.exercicioId.valor));
  return doPedido.flatMap((e) =>
    e.series
      .filter((s) => !s.removidaEm)
      .map((s) => ({ sessaoId: sessao.id, exercicioId: e.exercicioId, serie: { ...s } })),
  );
}

export class RepositorioDeSessoesEmMemoria implements RepositorioDeSessoes {
  private readonly sessoes = new Map<string, Sessao>();

  async iniciarSessao(sessao: NovaSessao): Promise<void> {
    this.sessoes.set(sessao.id.valor, copiar({ ...sessao, exercicios: [] }));
  }

  // Tudo ou nada, como a transação do SQLite: confere os identificadores antes de gravar.
  async iniciarSessaoComExercicios(
    sessao: NovaSessao,
    exercicios: NovoExercicioDaSessao[],
  ): Promise<void> {
    const ids = exercicios.map((e) => e.id.valor);
    const repetido = ids.find((id, indice) => ids.indexOf(id) !== indice);
    if (repetido !== undefined) {
      throw new ErroDeValidacao('exercício da sessão', 'identificador único', repetido);
    }
    // Grava direto, sem passar por iniciarSessao e adicionarExercicio: é uma operação só.
    const nova = copiar({ ...sessao, exercicios: [] });
    nova.exercicios = exercicios.map((e) => ({ ...e, series: [] }));
    this.sessoes.set(sessao.id.valor, nova);
  }

  // A de início mais recente; em empate, a gravada depois (o sort é estável).
  async buscarSessaoEmAndamento(): Promise<Sessao | null> {
    const abertas = [...this.sessoes.values()].filter((s) => s.situacao === 'em_andamento');
    const ultima = abertas.sort(porInicio).pop();
    return ultima ? copiar(ultima) : null;
  }

  async adicionarExercicio(
    sessaoId: Identificador,
    exercicio: NovoExercicioDaSessao,
  ): Promise<void> {
    const sessao = this.sessoes.get(sessaoId.valor);
    if (!sessao) throw new ErroDeValidacao('sessão', 'sessão existente', sessaoId.valor);
    sessao.exercicios.push({ ...exercicio, series: [] });
  }

  async encerrarSessao(
    sessaoId: Identificador,
    situacao: SituacaoEncerrada,
    fim: InstanteUtc,
  ): Promise<void> {
    const sessao = this.sessoes.get(sessaoId.valor);
    if (sessao?.situacao !== 'em_andamento') {
      throw new ErroDeValidacao('sessão', 'sessão em andamento', sessaoId.valor);
    }
    sessao.situacao = situacao;
    sessao.fim = fim;
  }

  async registrarSerie(exercicioDaSessaoId: Identificador, serie: SerieExecutada): Promise<void> {
    this.exercicioDaSessao(exercicioDaSessaoId).series.push({ ...serie });
  }

  async corrigirSerie(
    serieId: Identificador,
    corrigida: SerieExecutada,
    em: InstanteUtc,
  ): Promise<void> {
    for (const exercicio of this.todosOsExercicios()) {
      const indice = exercicio.series.findIndex(
        (s) => s.id.valor === serieId.valor && !s.removidaEm,
      );
      if (indice < 0) continue;
      exercicio.series[indice] = { ...exercicio.series[indice], removidaEm: em };
      exercicio.series.splice(indice + 1, 0, { ...corrigida });
      return;
    }
    throw new ErroDeValidacao('série', 'série ativa existente', serieId.valor);
  }

  async seriesDosExercicios(exercicioIds: Identificador[]): Promise<SerieDoHistorico[]> {
    const pedidos = new Set(exercicioIds.map((id) => id.valor));
    // O sort é estável: sessões com o mesmo início ficam na ordem em que foram iniciadas.
    const cronologicas = [...this.sessoes.values()].sort(porInicio);
    return cronologicas.flatMap((sessao) => seriesDaSessao(sessao, pedidos));
  }

  // A de maior fim; em empate vale a gravada depois (a ordem do Map é a da gravação).
  async ultimaRotinaConcluida(fichaId: Identificador): Promise<Identificador | null> {
    let ultima: Sessao | null = null;
    for (const sessao of this.sessoes.values()) {
      const serve =
        sessao.fichaId?.valor === fichaId.valor &&
        sessao.situacao === 'concluida' &&
        sessao.rotinaId !== null &&
        sessao.fim !== null;
      if (serve && (!ultima || sessao.fim!.iso >= ultima.fim!.iso)) ultima = sessao;
    }
    return ultima?.rotinaId ?? null;
  }

  async buscarSessao(id: Identificador): Promise<Sessao | null> {
    const sessao = this.sessoes.get(id.valor);
    return sessao ? copiar(sessao) : null;
  }

  private todosOsExercicios(): ExercicioDaSessao[] {
    return [...this.sessoes.values()].flatMap((sessao) => sessao.exercicios);
  }

  private exercicioDaSessao(id: Identificador): ExercicioDaSessao {
    const encontrado = this.todosOsExercicios().find((e) => e.id.valor === id.valor);
    if (!encontrado) {
      throw new ErroDeValidacao('exercício da sessão', 'exercício da sessão existente', id.valor);
    }
    return encontrado;
  }
}
