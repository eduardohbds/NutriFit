import type {
  OpcaoDeRemocao,
  RepositorioDoCatalogo,
  SituacaoDaFichaNoCatalogo,
  SituacaoDoExercicio,
} from '../../src/aplicacao/portas/repositorio-do-catalogo';
import type {
  ExercicioDoCatalogo,
  GruposDoExercicio,
  NovoExercicio,
} from '../../src/dominio/exercicio';
import { GRUPOS_MUSCULARES } from '../../src/dominio/grupo-muscular';
import { ErroDeValidacao } from '../../src/dominio/erro-de-validacao';
import { Identificador } from '../../src/dominio/identificador';
import {
  exigirIdentificadoresDiferentes,
  exigirSemMesclagemPrevia,
} from '../../src/dominio/mesclagem';

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
  // Descartado → mantido, como a coluna mesclado_em_id do SQLite.
  private readonly vinculos = new Map<string, string>();

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

  async criarExercicio(novo: NovoExercicio): Promise<void> {
    for (const nome of [...novo.grupos.diretos, ...novo.grupos.indiretos])
      if (!GRUPOS_MUSCULARES.includes(nome))
        throw new ErroDeValidacao('grupo', 'um dos 16 grupos da lista fixa', nome);
    this.semearCatalogo([
      {
        id: novo.id,
        nome: novo.nome,
        situacao: 'ativo',
        origem: 'usuario',
        unilateral: novo.unilateral,
        equipamento: novo.equipamento,
        sinonimos: [],
        gruposDiretos: [...novo.grupos.diretos],
        gruposIndiretos: [...novo.grupos.indiretos],
      },
    ]);
  }

  async adicionarSinonimo(id: Identificador, texto: string): Promise<void> {
    const guardado = this.catalogo.get(id.valor);
    if (!guardado) throw new ErroDeValidacao('exercicio', 'exercício existente', id.valor);
    if (!guardado.sinonimos.includes(texto)) guardado.sinonimos.push(texto);
  }

  async mesclarExercicios(mantidoId: Identificador, descartadoId: Identificador): Promise<void> {
    exigirIdentificadoresDiferentes(mantidoId, descartadoId);
    this.existente(descartadoId);
    this.existente(mantidoId);
    exigirSemMesclagemPrevia(
      { id: mantidoId, jaMesclado: this.vinculos.has(mantidoId.valor) },
      { id: descartadoId, jaMesclado: this.vinculos.has(descartadoId.valor) },
    );
    const nome = this.catalogo.get(descartadoId.valor)?.nome ?? '';
    this.arquivarNoCatalogo(descartadoId);
    for (const [absorvido, destino] of this.vinculos)
      if (destino === descartadoId.valor) this.vinculos.set(absorvido, mantidoId.valor);
    this.vinculos.set(descartadoId.valor, mantidoId.valor);
    await this.adicionarSinonimo(mantidoId, nome);
  }

  async exerciciosEquivalentes(id: Identificador): Promise<Identificador[]> {
    const raiz = this.vinculos.get(id.valor) ?? id.valor;
    const mesclados = [...this.vinculos].filter(([, destino]) => destino === raiz);
    return [Identificador.de(raiz), ...mesclados.map(([absorvido]) => Identificador.de(absorvido))];
  }

  async situacaoDoExercicio(id: Identificador): Promise<SituacaoDoExercicio | null> {
    return this.exercicios.get(id.valor)?.situacao ?? null;
  }

  async opcoesDeRemocaoDoExercicio(id: Identificador): Promise<OpcaoDeRemocao[]> {
    const exercicio = this.existente(id);
    return exercicio.emFicha || exercicio.emSessao ? ['arquivar'] : ['arquivar', 'excluir'];
  }

  async arquivarExercicio(id: Identificador): Promise<void> {
    this.arquivarNoCatalogo(id);
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

  // A situação mora em dois lugares no falso (o uso e o catálogo lido pela tela); muda nos dois.
  private arquivarNoCatalogo(id: Identificador): void {
    this.existente(id).situacao = 'arquivado';
    const lido = this.catalogo.get(id.valor);
    if (lido) lido.situacao = 'arquivado';
  }

  private existente(id: Identificador): ExercicioGuardado {
    const exercicio = this.exercicios.get(id.valor);
    if (!exercicio) throw new ErroDeValidacao('exercicio', 'exercício existente', id.valor);
    return exercicio;
  }
}
