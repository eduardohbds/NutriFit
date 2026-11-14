import type { RepositorioDeSessoes } from '../../src/aplicacao/portas/repositorio-de-sessoes';
import { ErroDeValidacao } from '../../src/dominio/erro-de-validacao';
import type { Identificador } from '../../src/dominio/identificador';
import type { InstanteUtc } from '../../src/dominio/instante-utc';
import type {
  ExercicioDaSessao,
  NovaSessao,
  NovoExercicioDaSessao,
  SerieExecutada,
  Sessao,
} from '../../src/dominio/sessao';

// Cópia na entrada e na saída: quem recebe um objeto não consegue alterar o que está guardado.
// Identificador, Carga e InstanteUtc são imutáveis e podem ser compartilhados.
function copiar(sessao: Sessao): Sessao {
  return {
    ...sessao,
    exercicios: sessao.exercicios.map((e) => ({ ...e, series: e.series.map((s) => ({ ...s })) })),
  };
}

export class RepositorioDeSessoesEmMemoria implements RepositorioDeSessoes {
  private readonly sessoes = new Map<string, Sessao>();

  async iniciarSessao(sessao: NovaSessao): Promise<void> {
    this.sessoes.set(sessao.id.valor, copiar({ ...sessao, exercicios: [] }));
  }

  async adicionarExercicio(
    sessaoId: Identificador,
    exercicio: NovoExercicioDaSessao,
  ): Promise<void> {
    const sessao = this.sessoes.get(sessaoId.valor);
    if (!sessao) throw new ErroDeValidacao('sessão', 'sessão existente', sessaoId.valor);
    sessao.exercicios.push({ ...exercicio, series: [] });
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
