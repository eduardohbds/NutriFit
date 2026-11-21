import { Carga } from '../../dominio/carga';
import { ErroDeValidacao } from '../../dominio/erro-de-validacao';
import type {
  Ficha,
  ItemDaRotina,
  NovaVersaoDaFicha,
  Rotina,
  SeriePlanejada,
  VersaoDaFicha,
} from '../../dominio/ficha';
import { exigirTipoUnicoDeRotina } from '../../dominio/identificacao-de-rotina';
import type { Identificador } from '../../dominio/identificador';
import { MetaDeSerie } from '../../dominio/meta-de-serie';
import { lerTecnica } from '../../dominio/tecnica-de-serie';
import type { GeradorDeIdentificador } from '../portas/gerador-de-identificador';
import type { Relogio } from '../portas/relogio';
import type { RepositorioDeFichas } from '../portas/repositorio-de-fichas';
import type { RepositorioDoCatalogo } from '../portas/repositorio-do-catalogo';

export interface SeriePedida {
  meta: string;
  cargaEmQuilos: number | null;
  tecnica: string | null;
  descansoSegundos: number | null;
}

export interface ItemPedido {
  ordem: number;
  exercicioId: Identificador;
  grupo: string | null;
  unilateral: boolean;
  observacoes: string | null;
  series: SeriePedida[];
}

export interface RotinaPedida {
  nome: string;
  diaDaSemana: number | null;
  itens: ItemPedido[];
}

export interface PedidoDeFicha {
  // Ausente = ficha nova (versão 1); presente = versão seguinte dessa ficha.
  fichaId?: Identificador;
  nome: string;
  motivo?: string | null;
  rotinas: RotinaPedida[];
}

export interface ResultadoDaFicha {
  fichaId: Identificador;
  versao: VersaoDaFicha;
}

// O campo do erro diz a rotina e a linha, para a tela apontar onde corrigir.
function erroNaLinha(
  rotina: string,
  ordem: number,
  campo: string,
  esperado: string,
  recebido: unknown,
): ErroDeValidacao {
  return new ErroDeValidacao(`${rotina}, linha ${ordem}: ${campo}`, esperado, recebido);
}

// Acrescenta a linha ao erro de quem leu o campo.
function naLinha<T>(rotina: string, ordem: number, ler: () => T): T {
  try {
    return ler();
  } catch (erro) {
    if (!(erro instanceof ErroDeValidacao)) throw erro;
    throw erroNaLinha(rotina, ordem, erro.campo, erro.esperado, erro.recebido);
  }
}

export class SalvarFicha {
  constructor(
    private readonly fichas: RepositorioDeFichas,
    private readonly catalogo: RepositorioDoCatalogo,
    private readonly gerador: GeradorDeIdentificador,
    private readonly relogio: Relogio,
  ) {}

  // Valida tudo antes de gravar: ou entra a versão inteira, ou nada (RB02, FI-4). Só inserção: a
  // ficha existente ganha a versão seguinte e as anteriores não são tocadas.
  async executar(pedido: PedidoDeFicha): Promise<ResultadoDaFicha> {
    exigirTipoUnicoDeRotina(pedido.rotinas);
    const existentes = new Set((await this.catalogo.listarExercicios()).map((e) => e.id.valor));
    const versao: NovaVersaoDaFicha = {
      id: this.gerador.gerar(),
      autor: 'usuario',
      criadaEm: this.relogio.agora(),
      motivo: pedido.motivo?.trim() || null,
      resumo: null,
      rotinas: pedido.rotinas.map((r) => this.montarRotina(r, existentes)),
    };
    if (pedido.fichaId) return this.novaVersao(pedido.fichaId, versao);
    return this.criarFicha(pedido.nome, versao);
  }

  private async novaVersao(
    fichaId: Identificador,
    versao: NovaVersaoDaFicha,
  ): Promise<ResultadoDaFicha> {
    return { fichaId, versao: await this.fichas.salvarNovaVersao(fichaId, versao) };
  }

  // Inativa: ativar é da US-009, e só uma ficha pode estar ativa.
  private async criarFicha(nome: string, versao: NovaVersaoDaFicha): Promise<ResultadoDaFicha> {
    const ficha: Ficha = {
      id: this.gerador.gerar(),
      nome,
      situacao: 'inativa',
      origem: 'manual',
      criadaEm: versao.criadaEm,
    };
    return { fichaId: ficha.id, versao: await this.fichas.criarFicha(ficha, versao) };
  }

  private montarRotina(rotina: RotinaPedida, existentes: Set<string>): Rotina {
    const ordenados = [...rotina.itens].sort((a, b) => a.ordem - b.ordem);
    const itens = ordenados.map((item, i) => {
      if (i > 0 && item.ordem === ordenados[i - 1].ordem)
        throw erroNaLinha(rotina.nome, item.ordem, 'ordem', 'ordem única na rotina', item.ordem);
      return this.montarItem(rotina.nome, item, existentes);
    });
    return { id: this.gerador.gerar(), nome: rotina.nome, diaDaSemana: rotina.diaDaSemana, itens };
  }

  private montarItem(rotina: string, item: ItemPedido, existentes: Set<string>): ItemDaRotina {
    if (!existentes.has(item.exercicioId.valor)) {
      const id = item.exercicioId.valor;
      throw erroNaLinha(rotina, item.ordem, 'exercício', 'exercício do catálogo', id);
    }
    if (item.series.length === 0)
      throw erroNaLinha(rotina, item.ordem, 'séries', 'ao menos 1 série', 0);
    return {
      id: this.gerador.gerar(),
      exercicioId: item.exercicioId,
      grupoSequencia: item.grupo,
      unilateral: item.unilateral,
      travado: false,
      observacoes: item.observacoes,
      series: item.series.map((s) => naLinha(rotina, item.ordem, () => this.montarSerie(s))),
    };
  }

  private montarSerie(serie: SeriePedida): SeriePlanejada {
    const { tipo, minimo, maximo, segundos } = MetaDeSerie.deTexto(serie.meta);
    return {
      id: this.gerador.gerar(),
      meta: { tipo, minimo, maximo, segundos },
      carga: serie.cargaEmQuilos === null ? null : Carga.deQuilos(serie.cargaEmQuilos),
      tecnica: lerTecnica(serie.tecnica),
      descansoSegundos: serie.descansoSegundos,
    };
  }
}
