import type {
  OpcaoDeRemocao,
  RepositorioDoCatalogo,
  SituacaoDaFichaNoCatalogo,
  SituacaoDoExercicio,
} from '../../src/aplicacao/portas/repositorio-do-catalogo';
import type { ExercicioDoCatalogo, GruposDoExercicio } from '../../src/dominio/exercicio';
import { GRUPOS_MUSCULARES } from '../../src/dominio/grupo-muscular';
import { ErroDeValidacao } from '../../src/dominio/erro-de-validacao';
import type { Identificador } from '../../src/dominio/identificador';

interface ExercicioGuardado {
  situacao: SituacaoDoExercicio;
  emFicha: boolean;
  emSessao: boolean;
}

// Cópia na entrada e na saída: quem recebe um exercício não altera o que está guardado.
function copiarExercicio(e: ExercicioDoCatalogo): ExercicioDoCatalogo {
  return {
    ...e,
    sinonimos: [...e.sinonimos],
    gruposDiretos: [...e.gruposDiretos],
    gruposIndiretos: [...e.gruposIndiretos],
  };
}

export class RepositorioDoCatalogoEmMemoria implements RepositorioDoCatalogo {
  private readonly exercicios = new Map<string, ExercicioGuardado>();
  private readonly catalogo = new Map<string, ExercicioDoCatalogo>();
  private readonly fichas = new Map<string, SituacaoDaFichaNoCatalogo>();

  // Apoio dos testes: o falso não tem como saber de fichas e sessões que vivem em outras portas.
  semearExercicio(id: Identificador, uso: { emFicha: boolean; emSessao: boolean }): void {
    this.exercicios.set(id.valor, { situacao: 'ativo', ...uso });
  }

  // Só para conferência: a ficha nunca é excluída, com ou sem sessões, e por isso nenhuma regra
  // do falso depende deste conjunto.
  readonly fichasComSessao = new Set<string>();

  semearFicha(id: Identificador, comSessao: boolean): void {
    this.fichas.set(id.valor, 'ativa');
    if (comSessao) this.fichasComSessao.add(id.valor);
  }

  // Apoio dos testes: exercícios do catálogo com grupos e sinônimos, sem uso em ficha ou sessão.
  semearCatalogo(exercicios: ExercicioDoCatalogo[]): void {
    for (const e of exercicios) {
      this.catalogo.set(e.id.valor, copiarExercicio(e));
      this.exercicios.set(e.id.valor, { situacao: e.situacao, emFicha: false, emSessao: false });
    }
  }

  async listarExercicios(): Promise<ExercicioDoCatalogo[]> {
    return [...this.catalogo.values()].map(copiarExercicio);
  }

  async gravarGrupos(id: Identificador, grupos: GruposDoExercicio): Promise<void> {
    const guardado = this.catalogo.get(id.valor);
    if (!guardado) throw new ErroDeValidacao('exercicio', 'exercício existente', id.valor);
    for (const nome of [...grupos.diretos, ...grupos.indiretos])
      if (!GRUPOS_MUSCULARES.includes(nome))
        throw new ErroDeValidacao('grupo', 'um dos 16 grupos da lista fixa', nome);
    guardado.gruposDiretos = [...grupos.diretos];
    guardado.gruposIndiretos = [...grupos.indiretos];
  }

  async situacaoDoExercicio(id: Identificador): Promise<SituacaoDoExercicio | null> {
    return this.exercicios.get(id.valor)?.situacao ?? null;
  }

  async opcoesDeRemocaoDoExercicio(id: Identificador): Promise<OpcaoDeRemocao[]> {
    const exercicio = this.existente(id);
    return exercicio.emFicha || exercicio.emSessao ? ['arquivar'] : ['arquivar', 'excluir'];
  }

  async arquivarExercicio(id: Identificador): Promise<void> {
    this.existente(id).situacao = 'arquivado';
  }

  async excluirExercicio(id: Identificador): Promise<void> {
    const opcoes = await this.opcoesDeRemocaoDoExercicio(id);
    if (!opcoes.includes('excluir'))
      throw new ErroDeValidacao('exercicio', 'exercício sem histórico', id.valor);
    this.exercicios.delete(id.valor);
  }

  async situacaoDaFicha(id: Identificador): Promise<SituacaoDaFichaNoCatalogo | null> {
    return this.fichas.get(id.valor) ?? null;
  }

  async opcoesDeRemocaoDaFicha(): Promise<OpcaoDeRemocao[]> {
    return ['arquivar'];
  }

  async arquivarFicha(id: Identificador): Promise<void> {
    if (!this.fichas.has(id.valor)) throw new ErroDeValidacao('ficha', 'ficha existente', id.valor);
    this.fichas.set(id.valor, 'arquivada');
  }

  private existente(id: Identificador): ExercicioGuardado {
    const exercicio = this.exercicios.get(id.valor);
    if (!exercicio) throw new ErroDeValidacao('exercicio', 'exercício existente', id.valor);
    return exercicio;
  }
}
