import { ErroDeEspacoInsuficiente } from '../../dominio/erro-de-espaco-insuficiente';
import type { Identificador } from '../../dominio/identificador';
import type { SerieExecutada } from '../../dominio/sessao';
import type { RepositorioDeSessoes } from '../portas/repositorio-de-sessoes';
import type { RegistrarFalha } from './registrar-falha';

export interface SerieConfirmada {
  exercicioDaSessaoId: Identificador;
  serie: SerieExecutada;
}

export type ResultadoDoRegistro = { gravada: true } | { gravada: false; motivo: 'sem_espaco' };

const ONDE = 'RegistrarSerie';

// A série concluída vai para o aparelho antes de qualquer outra coisa (RNF08, FI-1). Sem espaço,
// nada é gravado e o resultado volta sem consumir a entrada: quem chama reenvia a mesma série (CE61).
export class RegistrarSerie {
  constructor(
    private readonly sessoes: RepositorioDeSessoes,
    private readonly registrarFalha: RegistrarFalha,
  ) {}

  async executar({ exercicioDaSessaoId, serie }: SerieConfirmada): Promise<ResultadoDoRegistro> {
    try {
      await this.sessoes.registrarSerie(exercicioDaSessaoId, serie);
      return { gravada: true };
    } catch (erro) {
      if (!(erro instanceof ErroDeEspacoInsuficiente)) {
        await this.registrarFalha.executar({ onde: ONDE, erro });
        throw erro;
      }
      await this.registrarFalha.executar({ onde: ONDE, erro, codigo: 'SEM_ESPACO' });
      return { gravada: false, motivo: 'sem_espaco' };
    }
  }
}
