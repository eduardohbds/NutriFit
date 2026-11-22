import type { Identificador } from '../dominio/identificador';
import { ErroDeValidacao } from '../dominio/erro-de-validacao';
import type { FichaParaEdicao, ItemParaEdicao } from './casos-de-uso/ler-ficha-para-edicao';

// O rascunho guarda os campos de séries como o usuário os digita, sempre em texto, porque o que
// está pela metade (uma lista incompleta) ainda não é um valor válido. Quem valida e grava é o
// SalvarFicha (US-007c3); o rascunho nunca toca no banco (RB02, FI-4).
export type CampoDeSeries = 'quantidade' | 'meta' | 'carga' | 'tecnica' | 'descanso';

export type TextosEmEdicao = Record<CampoDeSeries, string>;

export interface ItemEmEdicao {
  exercicioId: Identificador;
  exercicioNome: string;
  grupo: string | null;
  unilateral: boolean;
  observacoes: string | null;
  textos: TextosEmEdicao;
}

export interface RotinaEmEdicao {
  nome: string;
  diaDaSemana: number | null;
  itens: ItemEmEdicao[];
}

export interface RascunhoDaFicha {
  fichaId: Identificador;
  nome: string;
  rotinas: RotinaEmEdicao[];
}

export interface ExercicioEscolhido {
  id: Identificador;
  nome: string;
}

function itemEmEdicao(item: ItemParaEdicao): ItemEmEdicao {
  const { quantidade, meta, carga, tecnica, descanso } = item.listas;
  return {
    exercicioId: item.exercicioId,
    exercicioNome: item.exercicioNome,
    grupo: item.grupo,
    unilateral: item.unilateral,
    observacoes: item.observacoes,
    textos: {
      quantidade: String(quantidade),
      meta,
      carga: carga ?? '',
      tecnica: tecnica ?? '',
      descanso: descanso ?? '',
    },
  };
}

export function rascunhoDaFicha(ficha: FichaParaEdicao): RascunhoDaFicha {
  return {
    fichaId: ficha.fichaId,
    nome: ficha.nome,
    rotinas: ficha.rotinas.map((rotina) => ({
      nome: rotina.nome,
      diaDaSemana: rotina.diaDaSemana,
      itens: rotina.itens.map(itemEmEdicao),
    })),
  };
}

// Devolve um rascunho novo com a linha trocada; o anterior não muda. Linha que não existe é erro de
// quem chama, e não some em silêncio.
function comItem(
  rascunho: RascunhoDaFicha,
  rotina: number,
  item: number,
  alterar: (atual: ItemEmEdicao) => ItemEmEdicao,
): RascunhoDaFicha {
  if (!rascunho.rotinas[rotina]?.itens[item]) {
    const esperado = 'rotina e linha existentes no rascunho';
    throw new ErroDeValidacao('linha', esperado, `${rotina}/${item}`);
  }
  const trocarItem = (itens: ItemEmEdicao[]) =>
    itens.map((atual, posicao) => (posicao === item ? alterar(atual) : atual));
  return {
    ...rascunho,
    rotinas: rascunho.rotinas.map((r, posicao) =>
      posicao === rotina ? { ...r, itens: trocarItem(r.itens) } : r,
    ),
  };
}

export function comExercicio(
  rascunho: RascunhoDaFicha,
  rotina: number,
  item: number,
  exercicio: ExercicioEscolhido,
): RascunhoDaFicha {
  return comItem(rascunho, rotina, item, (atual) => ({
    ...atual,
    exercicioId: exercicio.id,
    exercicioNome: exercicio.nome,
  }));
}

export function comTexto(
  rascunho: RascunhoDaFicha,
  rotina: number,
  item: number,
  campo: CampoDeSeries,
  texto: string,
): RascunhoDaFicha {
  return comItem(rascunho, rotina, item, (atual) => ({
    ...atual,
    textos: { ...atual.textos, [campo]: texto },
  }));
}
