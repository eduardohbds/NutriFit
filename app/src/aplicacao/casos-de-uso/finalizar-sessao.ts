import { ErroDeValidacao } from '../../dominio/erro-de-validacao';
import type { Identificador } from '../../dominio/identificador';
import type { InstanteUtc } from '../../dominio/instante-utc';
import type { ExercicioDaSessao, Sessao, SituacaoEncerrada } from '../../dominio/sessao';
import type { Relogio } from '../portas/relogio';
import type { RepositorioDeSessoes } from '../portas/repositorio-de-sessoes';
import type { RepositorioDoCatalogo } from '../portas/repositorio-do-catalogo';

export interface PedidoDeFim {
  sessaoId: Identificador;
  // Só depois de a pergunta "descartar?" ser respondida com sim (CE08).
  descartar?: boolean;
}

export interface SerieSemRir {
  exercicioDaSessaoId: Identificador;
  serieId: Identificador;
}

export interface ExercicioDoResumo {
  exercicioDaSessaoId: Identificador;
  nome: string;
  seriesFeitas: number;
}

export interface ResumoDaSessao {
  inicio: InstanteUtc;
  fim: InstanteUtc;
  duracaoEmSegundos: number;
  totalDeSeries: number;
  exercicios: ExercicioDoResumo[];
}

export type ResultadoDoFim =
  | { finalizada: true; situacao: 'concluida' | 'parcial'; resumo: ResumoDaSessao }
  | { finalizada: true; situacao: 'descartada' }
  | { finalizada: false; motivo: 'rir_pendente'; series: SerieSemRir[] }
  | { finalizada: false; motivo: 'sem_series' };

const feitas = (exercicio: ExercicioDaSessao) => exercicio.series.filter((s) => !s.removidaEm);

// Só a sessão em andamento termina, e só por ação do usuário (CE03). Nada é apagado: descartar e
// parcial só mudam a situação, e as séries feitas ficam como estavam (FI-1, FI-4).
export class FinalizarSessao {
  constructor(
    private readonly sessoes: RepositorioDeSessoes,
    private readonly catalogo: RepositorioDoCatalogo,
    private readonly relogio: Relogio,
  ) {}

  async executar({ sessaoId, descartar = false }: PedidoDeFim): Promise<ResultadoDoFim> {
    const sessao = await this.sessoes.buscarSessao(sessaoId);
    if (sessao?.situacao !== 'em_andamento') {
      throw new ErroDeValidacao(
        'sessão',
        'sessão em andamento',
        sessao?.situacao ?? sessaoId.valor,
      );
    }
    const total = sessao.exercicios.reduce((soma, e) => soma + feitas(e).length, 0);
    if (descartar) return this.descartar(sessao, total);
    if (total === 0) return { finalizada: false, motivo: 'sem_series' };
    const pendentes = seriesSemRir(sessao);
    if (pendentes.length > 0)
      return { finalizada: false, motivo: 'rir_pendente', series: pendentes };
    const situacao = temPrevistoSemSerie(sessao) ? 'parcial' : 'concluida';
    const fim = this.relogio.agora();
    await this.sessoes.encerrarSessao(sessao.id, situacao, fim);
    return { finalizada: true, situacao, resumo: await this.resumo(sessao, fim, total) };
  }

  private async descartar(sessao: Sessao, total: number): Promise<ResultadoDoFim> {
    if (total > 0) {
      throw new ErroDeValidacao('descartar', 'sessão sem séries', `sessão com ${total} séries`);
    }
    const situacao: SituacaoEncerrada = 'descartada';
    await this.sessoes.encerrarSessao(sessao.id, situacao, this.relogio.agora());
    return { finalizada: true, situacao };
  }

  private async resumo(sessao: Sessao, fim: InstanteUtc, total: number): Promise<ResumoDaSessao> {
    const nomes = new Map(
      (await this.catalogo.listarExercicios()).map((e) => [e.id.valor, e.nome]),
    );
    const exercicios = sessao.exercicios.map((e) => {
      const nome = nomes.get(e.exercicioId.valor);
      if (nome === undefined) {
        throw new ErroDeValidacao('exercício', 'exercício do catálogo', e.exercicioId.valor);
      }
      return { exercicioDaSessaoId: e.id, nome, seriesFeitas: feitas(e).length };
    });
    const duracaoEmSegundos = Math.round(
      (Date.parse(fim.iso) - Date.parse(sessao.inicio.iso)) / 1000,
    );
    return { inicio: sessao.inicio, fim, duracaoEmSegundos, totalDeSeries: total, exercicios };
  }
}

function seriesSemRir(sessao: Sessao): SerieSemRir[] {
  return sessao.exercicios.flatMap((e) =>
    feitas(e)
      .filter((s) => s.tipo === 'trabalho' && s.rir === null)
      .map((s) => ({ exercicioDaSessaoId: e.id, serieId: s.id })),
  );
}

// Previsto é o exercício que veio da ficha; o incluído só na sessão não torna a sessão parcial.
function temPrevistoSemSerie(sessao: Sessao): boolean {
  return sessao.exercicios.some((e) => e.itemOrigemId !== null && feitas(e).length === 0);
}
