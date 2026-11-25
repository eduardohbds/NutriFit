import { comparacaoLadoALado } from '../../dominio/diferenca-de-versoes';
import { ErroDeValidacao } from '../../dominio/erro-de-validacao';
import type { ItemDaRotina, VersaoDaFicha } from '../../dominio/ficha';
import type { Identificador } from '../../dominio/identificador';
import { textosDasSeries, type TextosDasSeries } from '../../dominio/textos-das-series';
import { fichaExistente } from '../ficha-existente';
import type { RepositorioDeFichas } from '../portas/repositorio-de-fichas';
import type { RepositorioDoCatalogo } from '../portas/repositorio-do-catalogo';

// Uma linha de uma das duas versões, pronta para a tela: nome do exercício e séries no texto da
// planilha.
export interface CelulaDaLinha {
  exercicioNome: string;
  grupo: string | null;
  unilateral: boolean;
  observacoes: string | null;
  listas: TextosDasSeries;
}

export interface LinhaDaComparacao {
  tipo: 'igual' | 'adicionada' | 'removida' | 'alterada';
  // Só na linha alterada: os campos que mudaram.
  campos: string[];
  antes: CelulaDaLinha | null;
  depois: CelulaDaLinha | null;
}

export interface RotinaDaComparacao {
  nome: string;
  situacao: 'igual' | 'adicionada' | 'removida';
  linhas: LinhaDaComparacao[];
}

export interface ComparacaoDeVersoes {
  fichaId: Identificador;
  // A menor das duas fica à esquerda ("de") e a maior à direita ("para").
  de: number;
  para: number;
  rotinas: RotinaDaComparacao[];
}

export interface PedidoDeComparacao {
  fichaId: Identificador;
  numeroA: number;
  numeroB: number;
}

function celula(item: ItemDaRotina | null, nomes: Map<string, string>): CelulaDaLinha | null {
  if (!item) return null;
  const exercicioNome = nomes.get(item.exercicioId.valor);
  if (exercicioNome === undefined) {
    throw new ErroDeValidacao('exercício', 'exercício do catálogo', item.exercicioId.valor);
  }
  return {
    exercicioNome,
    grupo: item.grupoSequencia,
    unilateral: item.unilateral,
    observacoes: item.observacoes,
    listas: textosDasSeries(item.series),
  };
}

// Lê as duas versões e o catálogo e devolve as linhas prontas para mostrar lado a lado: a menor
// versão fica à esquerda, qualquer que seja a ordem pedida. Só leitura (FI-4).
export class CompararVersoes {
  constructor(
    private readonly fichas: RepositorioDeFichas,
    private readonly catalogo: RepositorioDoCatalogo,
  ) {}

  async executar({ fichaId, numeroA, numeroB }: PedidoDeComparacao): Promise<ComparacaoDeVersoes> {
    await fichaExistente(this.fichas, fichaId);
    if (numeroA === numeroB) {
      throw new ErroDeValidacao('versões', 'duas versões diferentes', `${numeroA} e ${numeroB}`);
    }
    const [de, para] = numeroA < numeroB ? [numeroA, numeroB] : [numeroB, numeroA];
    const versoes = await this.fichas.listarVersoes(fichaId);
    const anterior = this.versao(versoes, de);
    const atual = this.versao(versoes, para);
    const exercicios = await this.catalogo.listarExercicios();
    const nomes = new Map(exercicios.map((e) => [e.id.valor, e.nome]));
    const rotinas = comparacaoLadoALado(anterior, atual).map((rotina) => ({
      nome: rotina.nome,
      situacao: rotina.situacao,
      linhas: rotina.linhas.map((linha) => ({
        tipo: linha.tipo,
        campos: linha.campos,
        antes: celula(linha.antes, nomes),
        depois: celula(linha.depois, nomes),
      })),
    }));
    return { fichaId, de, para, rotinas };
  }

  private versao(versoes: VersaoDaFicha[], numero: number): VersaoDaFicha {
    const achada = versoes.find((versao) => versao.numero === numero);
    if (achada) return achada;
    throw new ErroDeValidacao('versão', 'versão existente da ficha', numero);
  }
}
