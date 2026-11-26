import type { Carga } from '../../dominio/carga';
import { ErroDeValidacao } from '../../dominio/erro-de-validacao';
import type { SeriePlanejada } from '../../dominio/ficha';
import type { Identificador } from '../../dominio/identificador';
import type { Rir } from '../../dominio/rir';
import { rirInicial } from '../../dominio/serie-concluida';
import type { SerieDoHistorico, SerieExecutada } from '../../dominio/sessao';
import type { HistoricoDoExercicio } from './historico-do-exercicio';

export interface PedidoDeSerie {
  exercicioId: Identificador;
  // A sessão em andamento: o que ela já registrou não vale como "última sessão".
  sessaoId: Identificador;
  // Posição da série no exercício, a partir de 1.
  posicao: number;
  // As séries planejadas do item da ficha; vazio para exercício incluído só na sessão.
  planejadas: SeriePlanejada[];
}

export type OrigemDosValores = 'ultima_sessao' | 'ficha' | 'vazia';

export interface SerieSugerida {
  origem: OrigemDosValores;
  carga: Carga | null;
  repeticoes: number | null;
  repeticoesOutroLado: number | null;
  segundos: number | null;
  rir: Rir | null;
  // O descanso planejado depois da série anterior, só como referência, sem cronômetro.
  descansoDeReferencia: number | null;
}

type Valores = Omit<SerieSugerida, 'rir' | 'descansoDeReferencia'>;

const VAZIOS: Valores = {
  origem: 'vazia',
  carga: null,
  repeticoes: null,
  repeticoesOutroLado: null,
  segundos: null,
};

// Só leitura: a série vem preenchida com a de mesma posição da última sessão do exercício e, sem
// histórico, com a da ficha (RF02). O RIR nunca vem do histórico: é o esforço de cada série, e só a
// meta "falha" o traz pronto (0). Nenhum número é calculado aqui, só repetido do que foi gravado.
export class PrepararSerie {
  constructor(private readonly historico: HistoricoDoExercicio) {}

  async executar(pedido: PedidoDeSerie): Promise<SerieSugerida> {
    const { posicao, planejadas } = pedido;
    if (!Number.isInteger(posicao) || posicao < 1) {
      throw new ErroDeValidacao('posição', 'inteiro maior ou igual a 1', posicao);
    }
    const planejada = planejadas[posicao - 1] ?? null;
    const anterior = await this.serieDaUltimaSessao(pedido);
    return {
      ...(anterior ? doHistorico(anterior) : daFicha(planejada)),
      rir: rirInicial('trabalho', planejada?.meta ?? null),
      descansoDeReferencia:
        posicao === 1 ? null : (planejadas[posicao - 2]?.descansoSegundos ?? null),
    };
  }

  // O histórico vem em ordem cronológica das sessões (a família mesclada junta); a última sessão
  // com série de trabalho, que não seja a atual, é a do último elemento.
  private async serieDaUltimaSessao(pedido: PedidoDeSerie): Promise<SerieExecutada | null> {
    const todas = await this.historico.executar(pedido.exercicioId);
    const validas = todas.filter((item) => contaComoHistorico(item, pedido.sessaoId));
    const ultima = validas[validas.length - 1];
    if (!ultima) return null;
    const daSessao = validas.filter((item) => item.sessaoId.valor === ultima.sessaoId.valor);
    return daSessao[Math.min(pedido.posicao, daSessao.length) - 1].serie;
  }
}

function contaComoHistorico(item: SerieDoHistorico, sessaoAtual: Identificador): boolean {
  return item.serie.tipo === 'trabalho' && item.sessaoId.valor !== sessaoAtual.valor;
}

function doHistorico(serie: SerieExecutada): Valores {
  return {
    origem: 'ultima_sessao',
    carga: serie.carga,
    repeticoes: serie.repeticoes,
    repeticoesOutroLado: serie.repeticoesOutroLado,
    segundos: serie.segundos,
  };
}

function daFicha(planejada: SeriePlanejada | null): Valores {
  if (!planejada) return VAZIOS;
  const { tipo, minimo, segundos } = planejada.meta;
  const porRepeticoes = tipo === 'repeticoes' || tipo === 'faixa';
  return {
    ...VAZIOS,
    origem: 'ficha',
    carga: planejada.carga,
    repeticoes: porRepeticoes ? minimo : null,
    segundos: tipo === 'tempo' ? segundos : null,
  };
}
