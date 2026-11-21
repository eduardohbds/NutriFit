import type { Identificador } from '../../dominio/identificador';
import type { SerieDoHistorico } from '../../dominio/sessao';
import type { RepositorioDeSessoes } from '../portas/repositorio-de-sessoes';
import type { RepositorioDoCatalogo } from '../portas/repositorio-do-catalogo';

export class HistoricoDoExercicio {
  constructor(
    private readonly catalogo: RepositorioDoCatalogo,
    private readonly sessoes: RepositorioDeSessoes,
  ) {}

  // Só leitura. O catálogo diz quais exercícios formam um só depois de uma mesclagem (US-006a) e as
  // sessões devolvem as séries ativas de todos eles; as duas portas não precisam se conhecer.
  async executar(exercicioId: Identificador): Promise<SerieDoHistorico[]> {
    const equivalentes = await this.catalogo.exerciciosEquivalentes(exercicioId);
    return this.sessoes.seriesDosExercicios(equivalentes);
  }
}
