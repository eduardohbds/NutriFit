import type { Identificador } from '../../dominio/identificador';
import type { InstanteUtc } from '../../dominio/instante-utc';
import type {
  NovaSessao,
  NovoExercicioDaSessao,
  SerieDoHistorico,
  SerieExecutada,
  Sessao,
  SituacaoEncerrada,
} from '../../dominio/sessao';

// Nada é apagado nem sobrescrito (FI-4): corrigir uma série marca a antiga como removida e
// grava a corrigida no lugar dela. Valores derivados nunca passam por aqui (seção 18.6).
export interface RepositorioDeSessoes {
  iniciarSessao(sessao: NovaSessao): Promise<void>;
  // Atômico (RNF08, RB04): a sessão e todos os exercícios, na ordem dada, entram numa transação ou
  // nada entra. Identificadores repetidos entre os exercícios fazem tudo falhar, sem gravar nada.
  iniciarSessaoComExercicios(
    sessao: NovaSessao,
    exercicios: NovoExercicioDaSessao[],
  ): Promise<void>;
  // Só leitura (FI-4). A sessão em andamento, com exercícios e séries; a de início mais recente se
  // houver mais de uma. Nulo se nenhuma. Concluída, parcial e descartada não contam.
  buscarSessaoEmAndamento(): Promise<Sessao | null>;
  // Falha, sem gravar nada, se a sessão não existe.
  adicionarExercicio(sessaoId: Identificador, exercicio: NovoExercicioDaSessao): Promise<void>;
  // A série entra depois das já registradas. Falha, sem gravar nada, se o exercício da sessão não existe.
  registrarSerie(exercicioDaSessaoId: Identificador, serie: SerieExecutada): Promise<void>;
  // Marca a série antiga com `em` e grava a corrigida na mesma posição, numa única transação.
  corrigirSerie(serieId: Identificador, corrigida: SerieExecutada, em: InstanteUtc): Promise<void>;
  buscarSessao(id: Identificador): Promise<Sessao | null>;
  // Só a sessão em andamento se encerra: grava a situação final e o fim, sem tocar em exercícios nem
  // séries (FI-1, FI-4). Falha, sem gravar nada, se a sessão não existe ou já foi encerrada.
  encerrarSessao(
    sessaoId: Identificador,
    situacao: SituacaoEncerrada,
    fim: InstanteUtc,
  ): Promise<void>;
  // Só leitura (FI-4). A rotina da última sessão concluída da ficha, a de maior `fim` (em empate, a
  // gravada depois). Sessão em andamento, parcial, descartada, de outra ficha ou sem rotina não conta.
  // Nulo se nenhuma sessão serve. É o identificador da rotina na versão usada na época: o nome vem
  // das versões da ficha, e as duas portas não se conhecem.
  ultimaRotinaConcluida(fichaId: Identificador): Promise<Identificador | null>;
  // Só leitura (FI-4). As séries ativas (sem removida_em) de todas as sessões dos exercícios dados,
  // em ordem cronológica das sessões e, dentro de cada uma, na ordem de registro. Lista vazia para
  // nenhum exercício ou exercício sem sessões.
  seriesDosExercicios(exercicioIds: Identificador[]): Promise<SerieDoHistorico[]>;
}
