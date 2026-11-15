import { ErroDeEspacoInsuficiente } from '../../src/dominio/erro-de-espaco-insuficiente';
import type { Identificador } from '../../src/dominio/identificador';
import type { SerieExecutada } from '../../src/dominio/sessao';
import { RepositorioDeSessoesEmMemoria } from './repositorio-de-sessoes-em-memoria';

// Falso que simula o aparelho sem espaço: enquanto `cheio`, nada é gravado e o erro é o da porta.
export class RepositorioDeSessoesSemEspaco extends RepositorioDeSessoesEmMemoria {
  cheio = false;
  falhaInesperada: Error | null = null;

  override async registrarSerie(exercicioDaSessaoId: Identificador, serie: SerieExecutada) {
    if (this.falhaInesperada) throw this.falhaInesperada;
    if (this.cheio) throw new ErroDeEspacoInsuficiente();
    return super.registrarSerie(exercicioDaSessaoId, serie);
  }
}
