import { ArquivarFicha } from '../../src/aplicacao/casos-de-uso/arquivar-ficha';
import { AtivarFicha } from '../../src/aplicacao/casos-de-uso/ativar-ficha';
import { BuscarExercicios } from '../../src/aplicacao/casos-de-uso/buscar-exercicios';
import { DuplicarFicha } from '../../src/aplicacao/casos-de-uso/duplicar-ficha';
import { ListarFichas } from '../../src/aplicacao/casos-de-uso/listar-fichas';
import { LerFichaParaEdicao } from '../../src/aplicacao/casos-de-uso/ler-ficha-para-edicao';
import {
  SalvarFicha,
  type ItemPedido,
  type ListasDoItem,
  type PedidoDeFicha,
} from '../../src/aplicacao/casos-de-uso/salvar-ficha';
import type { Identificador } from '../../src/dominio/identificador';
import {
  LINHAS_DA_FICHA_DT01,
  type LinhaDaFichaDT01,
} from '../casos-de-referencia/ficha-de-referencia';
import { GeradorDeIdentificadorSequencial } from '../dubles/gerador-de-identificador-sequencial';
import { RelogioFixo } from '../dubles/relogio-fixo';
import { RepositorioDeFichasEmMemoria } from '../dubles/repositorio-de-fichas-em-memoria';
import { catalogoInicialParaTela } from './catalogo-de-tela';

export const NOME_DA_FICHA_DT01 = 'Ficha de referência (DT01)';
export const NOME_DA_FICHA_COMPLETA = 'Treino completo';

type IdsPorNome = Map<string, Identificador>;

function listas(quantidade: number, resto: Partial<ListasDoItem>): ListasDoItem {
  return { quantidade, meta: '10', carga: null, tecnica: null, descanso: null, ...resto };
}

const DIAS_DA_DT01 = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta'];

function itemDaDt01(linha: LinhaDaFichaDT01, ids: IdsPorNome): ItemPedido {
  return {
    ordem: linha.ordem,
    exercicioId: ids.get(linha.exercicio)!,
    grupo: null,
    unilateral: linha.unilateral,
    observacoes: linha.observacoes,
    listas: listas(linha.series, { meta: linha.meta }),
  };
}

// A DT01 como a US-007b a grava: nomes da ficha, sinônimo resolvido pelo catálogo.
export function pedidoDaDt01(ids: IdsPorNome): PedidoDeFicha {
  const rotinas = DIAS_DA_DT01.map((dia, indice) => {
    const linhas = LINHAS_DA_FICHA_DT01.filter((l) => l.rotina === dia);
    const itens = linhas.map((l) => itemDaDt01(l, ids));
    return { nome: dia, diaDaSemana: indice + 1, itens };
  });
  return { nome: NOME_DA_FICHA_DT01, rotinas };
}

// Uma ficha com todos os campos preenchidos: lista por série, bi-set, unilateral e observação.
export function pedidoCompleto(ids: IdsPorNome): PedidoDeFicha {
  const supino: ItemPedido = {
    ordem: 1,
    exercicioId: ids.get('Supino Reto')!,
    grupo: null,
    unilateral: false,
    observacoes: null,
    listas: listas(4, {
      meta: '12/10/8/falha',
      carga: '60/62,5/65/65',
      tecnica: 'aquecimento/-/-/-',
      descanso: '90/90/90/120',
    }),
  };
  const biset = (ordem: number, nome: string, observacoes: string | null): ItemPedido => ({
    ordem,
    exercicioId: ids.get(nome)!,
    grupo: 'A',
    unilateral: true,
    observacoes,
    listas: listas(3, { meta: '15', carga: '8', descanso: '0' }),
  });
  const itens = [
    supino,
    biset(2, 'Elevação Lateral', 'Bi-set com a elevação frontal'),
    biset(3, 'Elevação Frontal', null),
  ];
  const rotinas = [{ nome: 'Treino A', diaDaSemana: null, itens }];
  return { nome: NOME_DA_FICHA_COMPLETA, rotinas };
}

// Catálogo da seção 18.4 e duas fichas salvas pelo SalvarFicha: a DT01 (versão 1) e o treino
// completo (versões 1 e 2), tudo em memória, com os casos de uso reais da tela.
export async function fichasParaTela() {
  const catalogo = catalogoInicialParaTela();
  const fichas = new RepositorioDeFichasEmMemoria();
  const exercicios = await catalogo.repositorio.listarExercicios();
  const ids: IdsPorNome = new Map(
    exercicios.flatMap((e) => [e.nome, ...e.sinonimos].map((nome) => [nome, e.id] as const)),
  );
  const gerador = new GeradorDeIdentificadorSequencial();
  const salvar = new SalvarFicha(fichas, catalogo.repositorio, gerador, new RelogioFixo());
  const dt01 = await salvar.executar(pedidoDaDt01(ids));
  const completo = await salvar.executar(pedidoCompleto(ids));
  const ajuste = { ...pedidoCompleto(ids), fichaId: completo.fichaId, motivo: 'ajuste' };
  await salvar.executar(ajuste);
  return {
    fichas,
    catalogo: catalogo.repositorio,
    ids,
    fichaDaDt01: dt01.fichaId,
    fichaCompleta: completo.fichaId,
    buscarExercicios: new BuscarExercicios(catalogo.repositorio),
    gerador,
    ativarFicha: new AtivarFicha(fichas),
    arquivarFicha: new ArquivarFicha(fichas),
    duplicarFicha: new DuplicarFicha(fichas, gerador, new RelogioFixo()),
    salvarFicha: salvar,
    listarFichas: new ListarFichas(fichas),
    lerFichaParaEdicao: new LerFichaParaEdicao(fichas, catalogo.repositorio),
  };
}
