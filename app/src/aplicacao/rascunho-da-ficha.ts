import { DIAS_DA_SEMANA } from '../dominio/dia-da-semana';
import type { Identificador } from '../dominio/identificador';
import { ErroDeValidacao } from '../dominio/erro-de-validacao';
import type { FichaParaEdicao, ItemParaEdicao } from './casos-de-uso/ler-ficha-para-edicao';
import type { ItemPedido, PedidoDeFicha, RotinaPedida } from './casos-de-uso/salvar-ficha';

// O rascunho guarda os campos de séries como o usuário os digita, sempre em texto, porque o que
// está pela metade (uma lista incompleta) ainda não é um valor válido. Quem valida e grava é o
// SalvarFicha (US-007c3); o rascunho nunca toca no banco (RB02, FI-4).
export type CampoDeSeries = 'quantidade' | 'meta' | 'carga' | 'tecnica' | 'descanso';

export type TextosEmEdicao = Record<CampoDeSeries, string>;

export interface ItemEmEdicao {
  exercicioId: Identificador;
  exercicioNome: string;
  // Texto como o usuário digita: vazio significa sem grupo, e a regra da letra fica no SalvarFicha.
  grupo: string;
  unilateral: boolean;
  observacoes: string;
  textos: TextosEmEdicao;
}

export interface RotinaEmEdicao {
  nome: string;
  diaDaSemana: number | null;
  itens: ItemEmEdicao[];
}

// Como as rotinas da ficha se identificam (RB01): todas por dia da semana ou todas por rótulo.
export type TipoDeRotina = 'dia-da-semana' | 'rotacao';

export interface RascunhoDaFicha {
  // Nulo na ficha nova, que só ganha identificador quando o SalvarFicha a grava.
  fichaId: Identificador | null;
  nome: string;
  tipoDeRotina: TipoDeRotina;
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
    grupo: item.grupo ?? '',
    unilateral: item.unilateral,
    observacoes: item.observacoes ?? '',
    textos: {
      quantidade: String(quantidade),
      meta,
      carga: carga ?? '',
      tecnica: tecnica ?? '',
      descanso: descanso ?? '',
    },
  };
}

// A ficha é por dia da semana quando a primeira rotina tem dia; RB01 garante que as outras seguem.
function tipoDeRotinaDa(ficha: FichaParaEdicao): TipoDeRotina {
  const dia = ficha.rotinas[0]?.diaDaSemana;
  return typeof dia === 'number' ? 'dia-da-semana' : 'rotacao';
}

export function rascunhoDaFicha(ficha: FichaParaEdicao): RascunhoDaFicha {
  return {
    fichaId: ficha.fichaId,
    nome: ficha.nome,
    tipoDeRotina: tipoDeRotinaDa(ficha),
    rotinas: ficha.rotinas.map((rotina) => ({
      nome: rotina.nome,
      diaDaSemana: rotina.diaDaSemana,
      itens: rotina.itens.map(itemEmEdicao),
    })),
  };
}

// Linha que não existe é erro de quem chama, e não some em silêncio.
function exigirLinha(rascunho: RascunhoDaFicha, rotina: number, item: number): void {
  if (rascunho.rotinas[rotina]?.itens[item]) return;
  const esperado = 'rotina e linha existentes no rascunho';
  throw new ErroDeValidacao('linha', esperado, `${rotina}/${item}`);
}

// Devolve um rascunho novo com a linha trocada; o anterior não muda.
function comItem(
  rascunho: RascunhoDaFicha,
  rotina: number,
  item: number,
  alterar: (atual: ItemEmEdicao) => ItemEmEdicao,
): RascunhoDaFicha {
  exigirLinha(rascunho, rotina, item);
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

const INTEIRO = /^\d+$/;

// A quantidade é o único campo que o rascunho guarda em texto e o pedido em número.
function quantidadeDeSeries(rotina: string, ordem: number, texto: string): number {
  const limpo = texto.trim();
  const quantidade = INTEIRO.test(limpo) ? Number(limpo) : 0;
  if (quantidade >= 1) return quantidade;
  const campo = `${rotina}, linha ${ordem}: séries`;
  throw new ErroDeValidacao(campo, 'número inteiro maior ou igual a 1', texto);
}

const opcional = (texto: string): string | null => (texto.trim() === '' ? null : texto);

function itemDoPedido(rotina: string, item: ItemEmEdicao, posicao: number): ItemPedido {
  const ordem = posicao + 1;
  const { quantidade, meta, carga, tecnica, descanso } = item.textos;
  return {
    ordem,
    exercicioId: item.exercicioId,
    grupo: opcional(item.grupo.trim()),
    unilateral: item.unilateral,
    observacoes: opcional(item.observacoes.trim()),
    listas: {
      quantidade: quantidadeDeSeries(rotina, ordem, quantidade),
      meta,
      carga: opcional(carga),
      tecnica: opcional(tecnica),
      descanso: opcional(descanso),
    },
  };
}

function rotinaDoPedido(rotina: RotinaEmEdicao): RotinaPedida {
  const itens = rotina.itens.map((item, posicao) => itemDoPedido(rotina.nome, item, posicao));
  return { nome: rotina.nome, diaDaSemana: rotina.diaDaSemana, itens };
}

// Leva o rascunho ao pedido do SalvarFicha, que valida tudo e só então grava a versão nova (RB02).
// O rascunho em si nunca grava nada.
export function pedidoDoRascunho(rascunho: RascunhoDaFicha, motivo: string): PedidoDeFicha {
  return {
    fichaId: rascunho.fichaId ?? undefined,
    nome: rascunho.nome,
    motivo: opcional(motivo.trim()),
    rotinas: rascunho.rotinas.map(rotinaDoPedido),
  };
}

export function comGrupo(
  rascunho: RascunhoDaFicha,
  rotina: number,
  item: number,
  texto: string,
): RascunhoDaFicha {
  return comItem(rascunho, rotina, item, (atual) => ({ ...atual, grupo: texto }));
}

export function comObservacoes(
  rascunho: RascunhoDaFicha,
  rotina: number,
  item: number,
  texto: string,
): RascunhoDaFicha {
  return comItem(rascunho, rotina, item, (atual) => ({ ...atual, observacoes: texto }));
}

export function comUnilateral(
  rascunho: RascunhoDaFicha,
  rotina: number,
  item: number,
  valor: boolean,
): RascunhoDaFicha {
  return comItem(rascunho, rotina, item, (atual) => ({ ...atual, unilateral: valor }));
}

// O nome em branco é aceito no rascunho; quem o recusa é o SalvarFicha.
export function comNome(rascunho: RascunhoDaFicha, nome: string): RascunhoDaFicha {
  return { ...rascunho, nome };
}

// Troca os itens de uma rotina; rotina que não existe é erro de quem chama.
function comItensDaRotina(
  rascunho: RascunhoDaFicha,
  rotina: number,
  alterar: (itens: ItemEmEdicao[]) => ItemEmEdicao[],
): RascunhoDaFicha {
  if (!rascunho.rotinas[rotina]) {
    throw new ErroDeValidacao('rotina', 'rotina existente no rascunho', String(rotina));
  }
  return {
    ...rascunho,
    rotinas: rascunho.rotinas.map((r, posicao) =>
      posicao === rotina ? { ...r, itens: alterar(r.itens) } : r,
    ),
  };
}

// A linha nova entra no fim com 3 séries e meta 10; o resto o usuário preenche.
export function comLinhaNova(
  rascunho: RascunhoDaFicha,
  rotina: number,
  exercicio: ExercicioEscolhido,
): RascunhoDaFicha {
  const nova: ItemEmEdicao = {
    exercicioId: exercicio.id,
    exercicioNome: exercicio.nome,
    grupo: '',
    unilateral: false,
    observacoes: '',
    textos: { quantidade: '3', meta: '10', carga: '', tecnica: '', descanso: '' },
  };
  return comItensDaRotina(rascunho, rotina, (itens) => [...itens, nova]);
}

// Tirar a última linha deixa a rotina vazia; quem a barra é o SalvarFicha, na hora de salvar.
export function semLinha(rascunho: RascunhoDaFicha, rotina: number, item: number): RascunhoDaFicha {
  exigirLinha(rascunho, rotina, item);
  return comItensDaRotina(rascunho, rotina, (itens) =>
    itens.filter((_, posicao) => posicao !== item),
  );
}

// Subir a primeira ou descer a última linha não faz nada: devolve o mesmo rascunho.
export function comLinhaMovida(
  rascunho: RascunhoDaFicha,
  rotina: number,
  item: number,
  deslocamento: -1 | 1,
): RascunhoDaFicha {
  exigirLinha(rascunho, rotina, item);
  const alvo = item + deslocamento;
  if (alvo < 0 || alvo >= rascunho.rotinas[rotina].itens.length) return rascunho;
  return comItensDaRotina(rascunho, rotina, (itens) => {
    const movidos = [...itens];
    [movidos[item], movidos[alvo]] = [movidos[alvo], movidos[item]];
    return movidos;
  });
}

const LETRAS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

// A rotina nova nasce vazia: na ficha por dia, com o primeiro dia da semana livre e o nome dele;
// na ficha por rotação, com o primeiro "Treino A, B, C..." ainda não usado. Nulo se não há vaga.
function proximaRotina(rascunho: RascunhoDaFicha): RotinaEmEdicao | null {
  if (rascunho.tipoDeRotina === 'dia-da-semana') {
    const usados = new Set(rascunho.rotinas.map((r) => r.diaDaSemana));
    const dia = DIAS_DA_SEMANA.findIndex((_, posicao) => !usados.has(posicao + 1)) + 1;
    return dia === 0 ? null : { nome: DIAS_DA_SEMANA[dia - 1], diaDaSemana: dia, itens: [] };
  }
  const usados = new Set(rascunho.rotinas.map((r) => r.nome.trim()));
  const letra = [...LETRAS].find((l) => !usados.has(`Treino ${l}`));
  return letra ? { nome: `Treino ${letra}`, diaDaSemana: null, itens: [] } : null;
}

// A tela só oferece Nova rotina quando há vaga (um dia livre ou um rótulo livre).
export function podeIncluirRotina(rascunho: RascunhoDaFicha): boolean {
  return proximaRotina(rascunho) !== null;
}

function exigirRotina(rascunho: RascunhoDaFicha, rotina: number): void {
  if (rascunho.rotinas[rotina]) return;
  throw new ErroDeValidacao('rotina', 'rotina existente no rascunho', String(rotina));
}

export function comRotinaNova(rascunho: RascunhoDaFicha): RascunhoDaFicha {
  const nova = proximaRotina(rascunho);
  if (!nova) {
    throw new ErroDeValidacao(
      'rotina',
      'um dia ou rótulo livre para a rotina nova',
      'nenhum livre',
    );
  }
  return { ...rascunho, rotinas: [...rascunho.rotinas, nova] };
}

// Tirar a última rotina deixa a ficha sem rotinas; quem a barra é o SalvarFicha, ao salvar.
export function semRotina(rascunho: RascunhoDaFicha, rotina: number): RascunhoDaFicha {
  exigirRotina(rascunho, rotina);
  return { ...rascunho, rotinas: rascunho.rotinas.filter((_, posicao) => posicao !== rotina) };
}

// O nome em branco é aceito no rascunho; o dia da semana da rotina não muda.
export function comRotinaRenomeada(
  rascunho: RascunhoDaFicha,
  rotina: number,
  nome: string,
): RascunhoDaFicha {
  exigirRotina(rascunho, rotina);
  const renomear = (r: RotinaEmEdicao, posicao: number) =>
    posicao === rotina ? { ...r, nome } : r;
  return { ...rascunho, rotinas: rascunho.rotinas.map(renomear) };
}

// Subir a primeira ou descer a última rotina não faz nada: devolve o mesmo rascunho.
export function comRotinaMovida(
  rascunho: RascunhoDaFicha,
  rotina: number,
  deslocamento: -1 | 1,
): RascunhoDaFicha {
  exigirRotina(rascunho, rotina);
  const alvo = rotina + deslocamento;
  if (alvo < 0 || alvo >= rascunho.rotinas.length) return rascunho;
  const movidas = [...rascunho.rotinas];
  [movidas[rotina], movidas[alvo]] = [movidas[alvo], movidas[rotina]];
  return { ...rascunho, rotinas: movidas };
}

// A ficha nova começa vazia: sem identificador (ele nasce no SalvarFicha), sem nome e sem rotinas.
export function rascunhoDeFichaNova(tipoDeRotina: TipoDeRotina): RascunhoDaFicha {
  return { fichaId: null, nome: '', tipoDeRotina, rotinas: [] };
}
