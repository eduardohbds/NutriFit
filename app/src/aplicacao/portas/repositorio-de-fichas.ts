import type { Ficha, NovaVersaoDaFicha, VersaoDaFicha } from '../../dominio/ficha';
import type { Identificador } from '../../dominio/identificador';

// Só inserção (RB02): não há método para atualizar nem excluir versão, rotina, item ou série
// planejada. Alterar uma ficha é gravar a versão seguinte.
export interface RepositorioDeFichas {
  // Grava a ficha e a versão 1 numa única transação.
  criarFicha(ficha: Ficha, primeiraVersao: NovaVersaoDaFicha): Promise<VersaoDaFicha>;
  // Grava a versão seguinte (maior número + 1); falha, sem gravar nada, se a ficha não existe.
  salvarNovaVersao(fichaId: Identificador, versao: NovaVersaoDaFicha): Promise<VersaoDaFicha>;
  // Todas as fichas, arquivadas inclusive, na ordem de criação (a mais antiga primeiro; em empate de
  // data, a gravada antes). Só a ficha: as versões vêm de listarVersoes e buscarVersaoAtual.
  listarFichas(): Promise<Ficha[]>;
  // Em ordem crescente de número.
  listarVersoes(fichaId: Identificador): Promise<VersaoDaFicha[]>;
  // A versão atual é a de maior número; nula se a ficha não existe.
  buscarVersaoAtual(fichaId: Identificador): Promise<VersaoDaFicha | null>;
}
