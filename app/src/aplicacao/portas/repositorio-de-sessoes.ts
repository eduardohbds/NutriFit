import type { Identificador } from '../../dominio/identificador';
import type { InstanteUtc } from '../../dominio/instante-utc';
import type {
  NovaSessao,
  NovoExercicioDaSessao,
  SerieDoHistorico,
  SerieExecutada,
  Sessao,
} from '../../dominio/sessao';

// Nada é apagado nem sobrescrito (FI-4): corrigir uma série marca a antiga como removida e
// grava a corrigida no lugar dela. Valores derivados nunca passam por aqui (seção 18.6).
export interface RepositorioDeSessoes {
  iniciarSessao(sessao: NovaSessao): Promise<void>;
  // Falha, sem gravar nada, se a sessão não existe.
  adicionarExercicio(sessaoId: Identificador, exercicio: NovoExercicioDaSessao): Promise<void>;
  // A série entra depois das já registradas. Falha, sem gravar nada, se o exercício da sessão não existe.
  registrarSerie(exercicioDaSessaoId: Identificador, serie: SerieExecutada): Promise<void>;
  // Marca a série antiga com `em` e grava a corrigida na mesma posição, numa única transação.
  corrigirSerie(serieId: Identificador, corrigida: SerieExecutada, em: InstanteUtc): Promise<void>;
  buscarSessao(id: Identificador): Promise<Sessao | null>;
  // Só leitura (FI-4). As séries ativas (sem removida_em) de todas as sessões dos exercícios dados,
  // em ordem cronológica das sessões e, dentro de cada uma, na ordem de registro. Lista vazia para
  // nenhum exercício ou exercício sem sessões.
  seriesDosExercicios(exercicioIds: Identificador[]): Promise<SerieDoHistorico[]>;
}
