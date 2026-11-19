import { ErroDeValidacao } from '../../dominio/erro-de-validacao';
import { validarGruposDoExercicio } from '../../dominio/grupo-muscular';
import type { Identificador } from '../../dominio/identificador';
import type { GeradorDeIdentificador } from '../portas/gerador-de-identificador';
import type { RepositorioDoCatalogo } from '../portas/repositorio-do-catalogo';

export interface PedidoDeCriacaoDeExercicio {
  nome: string;
  unilateral?: boolean;
  equipamento?: string | null;
  gruposDiretos: string[];
  gruposIndiretos: string[];
  confirmouSemGrupos?: boolean;
}

export type ResultadoDaCriacaoDeExercicio =
  { criado: true; id: Identificador } | { criado: false; motivo: 'pede_confirmacao_sem_grupos' };

export class CriarExercicio {
  constructor(
    private readonly catalogo: RepositorioDoCatalogo,
    private readonly gerador: GeradorDeIdentificador,
  ) {}

  // Valida antes de gravar; exercício sem nenhum grupo só é gravado depois da confirmação, porque
  // fica fora da contagem (VE20), como na edição de grupos.
  async executar(pedido: PedidoDeCriacaoDeExercicio): Promise<ResultadoDaCriacaoDeExercicio> {
    const nome = pedido.nome.trim();
    if (nome === '') throw new ErroDeValidacao('nome', 'texto não vazio', pedido.nome);
    const grupos = validarGruposDoExercicio(pedido.gruposDiretos, pedido.gruposIndiretos);
    const semGrupos = grupos.diretos.length === 0 && grupos.indiretos.length === 0;
    if (semGrupos && !pedido.confirmouSemGrupos)
      return { criado: false, motivo: 'pede_confirmacao_sem_grupos' };
    const id = this.gerador.gerar();
    await this.catalogo.criarExercicio({
      id,
      nome,
      unilateral: pedido.unilateral ?? false,
      equipamento: pedido.equipamento ?? null,
      grupos,
    });
    return { criado: true, id };
  }
}
