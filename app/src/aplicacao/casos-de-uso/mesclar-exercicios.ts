import type { Identificador } from '../../dominio/identificador';
import { exigirIdentificadoresDiferentes } from '../../dominio/mesclagem';
import type { RepositorioDoCatalogo } from '../portas/repositorio-do-catalogo';

export interface PedidoDeMesclagem {
  mantidoId: Identificador;
  descartadoId: Identificador;
}

export class MesclarExercicios {
  constructor(private readonly catalogo: RepositorioDoCatalogo) {}

  // O vínculo, o arquivamento e o sinônimo entram numa transação só, na porta; o histórico de
  // sessões e versões de ficha não é tocado (FI-4).
  async executar(pedido: PedidoDeMesclagem): Promise<void> {
    exigirIdentificadoresDiferentes(pedido.mantidoId, pedido.descartadoId);
    await this.catalogo.mesclarExercicios(pedido.mantidoId, pedido.descartadoId);
  }
}
