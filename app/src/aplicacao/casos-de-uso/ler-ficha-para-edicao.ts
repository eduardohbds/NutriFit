import { ErroDeValidacao } from '../../dominio/erro-de-validacao';
import type { ItemDaRotina, Rotina, SituacaoDaFicha } from '../../dominio/ficha';
import type { Identificador } from '../../dominio/identificador';
import { textosDasSeries, type TextosDasSeries } from '../../dominio/textos-das-series';
import type { RepositorioDeFichas } from '../portas/repositorio-de-fichas';
import type { RepositorioDoCatalogo } from '../portas/repositorio-do-catalogo';

export interface ItemParaEdicao {
  ordem: number;
  exercicioId: Identificador;
  exercicioNome: string;
  grupo: string | null;
  unilateral: boolean;
  observacoes: string | null;
  listas: TextosDasSeries;
}

export interface RotinaParaEdicao {
  nome: string;
  diaDaSemana: number | null;
  itens: ItemParaEdicao[];
}

export interface FichaParaEdicao {
  fichaId: Identificador;
  nome: string;
  situacao: SituacaoDaFicha;
  versaoAtual: number;
  rotinas: RotinaParaEdicao[];
}

type NomesDosExercicios = Map<string, string>;

function itemParaEdicao(item: ItemDaRotina, posicao: number, nomes: NomesDosExercicios) {
  const exercicioNome = nomes.get(item.exercicioId.valor);
  if (exercicioNome === undefined) {
    throw new ErroDeValidacao('exercício', 'exercício do catálogo', item.exercicioId.valor);
  }
  return {
    ordem: posicao + 1,
    exercicioId: item.exercicioId,
    exercicioNome,
    grupo: item.grupoSequencia,
    unilateral: item.unilateral,
    observacoes: item.observacoes,
    listas: textosDasSeries(item.series),
  };
}

function rotinaParaEdicao(rotina: Rotina, nomes: NomesDosExercicios): RotinaParaEdicao {
  const itens = rotina.itens.map((item, posicao) => itemParaEdicao(item, posicao, nomes));
  return { nome: rotina.nome, diaDaSemana: rotina.diaDaSemana, itens };
}

// A versão atual de uma ficha no formato da planilha (seção 11.3), pronta para a tela e para voltar
// ao SalvarFicha. Só leitura: nada é gravado (RB02, FI-4). O nome do exercício vem do catálogo, que
// guarda também os arquivados e os mesclados.
export class LerFichaParaEdicao {
  constructor(
    private readonly fichas: RepositorioDeFichas,
    private readonly catalogo: RepositorioDoCatalogo,
  ) {}

  async executar(fichaId: Identificador): Promise<FichaParaEdicao | null> {
    const ficha = (await this.fichas.listarFichas()).find((f) => f.id.valor === fichaId.valor);
    const versao = ficha ? await this.fichas.buscarVersaoAtual(fichaId) : null;
    if (!ficha || !versao) return null;
    const exercicios = await this.catalogo.listarExercicios();
    const nomes: NomesDosExercicios = new Map(exercicios.map((e) => [e.id.valor, e.nome]));
    return {
      fichaId,
      nome: ficha.nome,
      situacao: ficha.situacao,
      versaoAtual: versao.numero,
      rotinas: versao.rotinas.map((rotina) => rotinaParaEdicao(rotina, nomes)),
    };
  }
}
