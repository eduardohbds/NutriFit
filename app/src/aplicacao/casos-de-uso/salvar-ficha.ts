import { Carga } from '../../dominio/carga';
import { lerCargaEmQuilos } from '../../dominio/carga-planejada';
import { lerDescanso } from '../../dominio/descanso-de-serie';
import { ErroDeValidacao } from '../../dominio/erro-de-validacao';
import type {
  Ficha,
  ItemDaRotina,
  NovaVersaoDaFicha,
  Rotina,
  SeriePlanejada,
  VersaoDaFicha,
} from '../../dominio/ficha';
import { exigirGruposEmSequencia } from '../../dominio/grupo-em-sequencia';
import { exigirTipoUnicoDeRotina } from '../../dominio/identificacao-de-rotina';
import type { Identificador } from '../../dominio/identificador';
import { listaPorSerie } from '../../dominio/lista-por-serie';
import { MetaDeSerie } from '../../dominio/meta-de-serie';
import { nomeDaRotina } from '../../dominio/nome-da-rotina';
import { exigirFichaComRotinas, exigirRotinasComLinhas } from '../../dominio/rotina-com-linhas';
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

// Séries por texto, como na planilha (seção 11.3): um valor vale para todas as séries, e a lista
// separada por barra traz exatamente um valor por série.
export interface ListasDoItem {
  quantidade: number;
  meta: string;
  carga: string | null;
  tecnica: string | null;
  descanso: string | null;
}

// Informe `series` (uma por série) ou `listas` (texto por campo), nunca os dois.
export interface ItemPedido {
  ordem: number;
  exercicioId: Identificador;
  grupo: string | null;
  unilateral: boolean;
  observacoes: string | null;
  series?: SeriePedida[];
  listas?: ListasDoItem;
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

// Valor ausente ou vazio vale para todas as séries como "não informado".
function valoresPorSerie(campo: string, texto: string | null, quantidade: number) {
  if (texto === null || texto.trim() === '') return Array<string | null>(quantidade).fill(null);
  return listaPorSerie(campo, texto, quantidade);
}

// Expande o texto de cada campo em uma série pedida por posição (RB06, seção 11.3).
function seriesPorListas(listas: ListasDoItem): SeriePedida[] {
  const n = listas.quantidade;
  if (!Number.isInteger(n) || n < 1) throw new ErroDeValidacao('séries', 'ao menos 1 série', n);
  const metas = listaPorSerie('meta', listas.meta, n);
  const cargas = valoresPorSerie('carga', listas.carga, n);
  const tecnicas = valoresPorSerie('técnica', listas.tecnica, n);
  const descansos = valoresPorSerie('descanso', listas.descanso, n);
  return metas.map((meta, i) => ({
    meta,
    cargaEmQuilos: lerCargaEmQuilos(cargas[i]),
    tecnica: tecnicas[i],
    descansoSegundos: lerDescanso(descansos[i]),
  }));
}

// O nome da ficha é aparado e não pode ficar em branco. Numa ficha existente ele é gravado junto com
// a versão nova, e as versões anteriores não são tocadas (RB02).
function exigirNome(nome: string): string {
  const aparado = nome.trim();
  if (aparado === '') {
    throw new ErroDeValidacao('nome da ficha', 'texto com ao menos 1 caractere', nome);
  }
  return aparado;
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
    const nome = exigirNome(pedido.nome);
    exigirFichaComRotinas(pedido.rotinas);
    const rotinas = pedido.rotinas.map((r, i) => ({ ...r, nome: nomeDaRotina(r.nome, i + 1) }));
    exigirTipoUnicoDeRotina(rotinas);
    exigirRotinasComLinhas(rotinas);
    const existentes = new Set((await this.catalogo.listarExercicios()).map((e) => e.id.valor));
    const versao: NovaVersaoDaFicha = {
      id: this.gerador.gerar(),
      autor: 'usuario',
      criadaEm: this.relogio.agora(),
      motivo: pedido.motivo?.trim() || null,
      resumo: null,
      rotinas: rotinas.map((r) => this.montarRotina(r, existentes)),
    };
    if (pedido.fichaId) return this.novaVersao(pedido.fichaId, versao, nome);
    return this.criarFicha(nome, versao);
  }

  private async novaVersao(
    fichaId: Identificador,
    versao: NovaVersaoDaFicha,
    nome: string,
  ): Promise<ResultadoDaFicha> {
    return { fichaId, versao: await this.fichas.salvarNovaVersao(fichaId, versao, nome) };
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
    exigirGruposEmSequencia(
      rotina.nome,
      rotina.itens.map((i) => ({ ordem: i.ordem, grupo: i.grupo })),
    );
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
    const series = this.seriesDoItem(rotina, item);
    if (series.length === 0) throw erroNaLinha(rotina, item.ordem, 'séries', 'ao menos 1 série', 0);
    return {
      id: this.gerador.gerar(),
      exercicioId: item.exercicioId,
      grupoSequencia: item.grupo,
      unilateral: item.unilateral,
      travado: false,
      observacoes: item.observacoes,
      series: series.map((s) => naLinha(rotina, item.ordem, () => this.montarSerie(s))),
    };
  }

  private seriesDoItem(rotina: string, item: ItemPedido): SeriePedida[] {
    if (item.series && item.listas) {
      throw erroNaLinha(rotina, item.ordem, 'séries', 'series ou listas, não os dois', 'ambos');
    }
    const { listas } = item;
    if (listas) return naLinha(rotina, item.ordem, () => seriesPorListas(listas));
    return item.series ?? [];
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
