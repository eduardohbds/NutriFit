import { validarGruposDoExercicio } from '../../dominio/grupo-muscular';
import type { Identificador } from '../../dominio/identificador';
import type { RepositorioDoCatalogo } from '../portas/repositorio-do-catalogo';

export interface PedidoDeEdicaoDeGrupos {
  exercicioId: Identificador;
  gruposDiretos: string[];
  gruposIndiretos: string[];
  // O usuário já viu o aviso de que o exercício sem grupo fica fora da contagem e quer salvar assim.
  confirmouSemGrupos?: boolean;
}

export type ResultadoDaEdicaoDeGrupos =
  { salvo: true } | { salvo: false; motivo: 'pede_confirmacao_sem_grupos' };

// Valida antes de gravar: o salvamento é bloqueado com o valor recebido e o formato esperado, e
// exercício sem nenhum grupo só é gravado depois da confirmação, porque fica fora da contagem.
export class EditarGruposDoExercicio {
  constructor(private readonly catalogo: RepositorioDoCatalogo) {}

  async executar(pedido: PedidoDeEdicaoDeGrupos): Promise<ResultadoDaEdicaoDeGrupos> {
    const grupos = validarGruposDoExercicio(pedido.gruposDiretos, pedido.gruposIndiretos);
    const semGrupos = grupos.diretos.length === 0 && grupos.indiretos.length === 0;
    if (semGrupos && !pedido.confirmouSemGrupos)
      return { salvo: false, motivo: 'pede_confirmacao_sem_grupos' };
    await this.catalogo.gravarGrupos(pedido.exercicioId, grupos);
    return { salvo: true };
  }
}
