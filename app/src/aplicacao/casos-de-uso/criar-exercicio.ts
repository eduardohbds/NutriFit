import { ErroDeValidacao } from '../../dominio/erro-de-validacao';
import type { ExercicioDoCatalogo } from '../../dominio/exercicio';
import { validarGruposDoExercicio } from '../../dominio/grupo-muscular';
import type { Identificador } from '../../dominio/identificador';
import { nomesParecidos } from '../../dominio/nome-parecido';
import type { GeradorDeIdentificador } from '../portas/gerador-de-identificador';
import type { RepositorioDoCatalogo } from '../portas/repositorio-do-catalogo';

export interface PedidoDeCriacaoDeExercicio {
  nome: string;
  unilateral?: boolean;
  equipamento?: string | null;
  gruposDiretos: string[];
  gruposIndiretos: string[];
  confirmouSemGrupos?: boolean;
  confirmouNomeParecido?: boolean;
}

export interface ExercicioParecido {
  id: Identificador;
  nome: string;
}

export type ResultadoDaCriacaoDeExercicio =
  | { criado: true; id: Identificador }
  | { criado: false; motivo: 'pede_confirmacao_sem_grupos' }
  | {
      criado: false;
      motivo: 'nome_parecido';
      existente: ExercicioParecido;
    };

function temNomeParecido(exercicio: ExercicioDoCatalogo, nome: string): boolean {
  return [exercicio.nome, ...exercicio.sinonimos].some((n) => nomesParecidos(n, nome));
}

export class CriarExercicio {
  constructor(
    private readonly catalogo: RepositorioDoCatalogo,
    private readonly gerador: GeradorDeIdentificador,
  ) {}

  // Valida antes de gravar. Nome igual ou parecido ao de um exercício ativo (nome ou sinônimo)
  // devolve o aviso e só grava depois da confirmação (RB35). Exercício sem nenhum grupo também
  // espera a confirmação, porque fica fora da contagem (VE20), como na edição de grupos.
  async executar(pedido: PedidoDeCriacaoDeExercicio): Promise<ResultadoDaCriacaoDeExercicio> {
    const nome = pedido.nome.trim();
    if (nome === '') throw new ErroDeValidacao('nome', 'texto não vazio', pedido.nome);
    const grupos = validarGruposDoExercicio(pedido.gruposDiretos, pedido.gruposIndiretos);
    const parecido = pedido.confirmouNomeParecido ? undefined : await this.buscarParecido(nome);
    if (parecido) return { criado: false, motivo: 'nome_parecido', existente: parecido };
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

  // Arquivado já saiu das escolhas: sugerir associar a ele não ajudaria.
  private async buscarParecido(nome: string): Promise<ExercicioParecido | undefined> {
    const todos = await this.catalogo.listarExercicios();
    const achado = todos.find((e) => e.situacao === 'ativo' && temNomeParecido(e, nome));
    return achado && { id: achado.id, nome: achado.nome };
  }
}
