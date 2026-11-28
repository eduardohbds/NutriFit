import type { Identificador } from '../../dominio/identificador';
import { concluirSerie, type EntradaDaSerie } from '../../dominio/serie-concluida';
import type { SerieExecutada } from '../../dominio/sessao';
import type { GeradorDeIdentificador } from '../portas/gerador-de-identificador';
import type { Relogio } from '../portas/relogio';
import type { RegistrarSerie, ResultadoDoRegistro } from './registrar-serie';

export interface PedidoDeConclusao {
  exercicioDaSessaoId: Identificador;
  entrada: EntradaDaSerie;
}

// Do texto digitado à série gravada: valida tudo antes (o primeiro campo inválido sobe como
// ErroDeValidacao, sem gravar nada, RB09) e grava pelo RegistrarSerie, que põe a série no aparelho
// antes de qualquer outra coisa (RNF08, FI-1). A data e a hora são as reais do relógio (RF02).
export class ConcluirSerieDaSessao {
  constructor(
    private readonly registrarSerie: RegistrarSerie,
    private readonly relogio: Relogio,
    private readonly gerador: GeradorDeIdentificador,
  ) {}

  async executar({
    exercicioDaSessaoId,
    entrada,
  }: PedidoDeConclusao): Promise<ResultadoDoRegistro> {
    const dados = concluirSerie(entrada);
    const serie: SerieExecutada = {
      ...dados,
      id: this.gerador.gerar(),
      rir: dados.rir?.valor ?? null,
      tecnica: null,
      concluidaEm: this.relogio.agora(),
      removidaEm: null,
    };
    return this.registrarSerie.executar({ exercicioDaSessaoId, serie });
  }
}
