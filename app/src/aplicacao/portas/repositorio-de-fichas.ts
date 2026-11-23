import type { Ficha, NovaVersaoDaFicha, VersaoDaFicha } from '../../dominio/ficha';
import type { Identificador } from '../../dominio/identificador';

// Só inserção (RB02): não há método para atualizar nem excluir versão, rotina, item ou série
// planejada. Alterar uma ficha é gravar a versão seguinte.
export interface RepositorioDeFichas {
  // Grava a ficha e a versão 1 numa única transação.
  criarFicha(ficha: Ficha, primeiraVersao: NovaVersaoDaFicha): Promise<VersaoDaFicha>;
  // Grava a versão seguinte (maior número + 1); falha, sem gravar nada, se a ficha não existe.
  // Com `novoNome`, a ficha também é renomeada na mesma transação (só a ficha: as versões anteriores
  // não são tocadas, RB02). Sem ele, o nome continua o mesmo.
  salvarNovaVersao(
    fichaId: Identificador,
    versao: NovaVersaoDaFicha,
    novoNome?: string,
  ): Promise<VersaoDaFicha>;
  // Todas as fichas, arquivadas inclusive, na ordem de criação (a mais antiga primeiro; em empate de
  // data, a gravada antes). Só a ficha: as versões vêm de listarVersoes e buscarVersaoAtual.
  listarFichas(): Promise<Ficha[]>;
  // Marca a ficha como ativa e, na mesma transação, a que estava ativa volta a inativa (SL09). Só
  // muda a situação: versão, sessão e série não são tocadas (RB02, FI-4). Falha com
  // ErroDeValidacao, sem alterar nada, se a ficha não existe.
  ativarFicha(fichaId: Identificador): Promise<void>;
  // Muda só a situação para arquivada: a ficha, as versões e as sessões continuam guardadas (RB04).
  // Falha com ErroDeValidacao, sem alterar nada, se a ficha não existe.
  arquivarFicha(fichaId: Identificador): Promise<void>;
  // Em ordem crescente de número.
  listarVersoes(fichaId: Identificador): Promise<VersaoDaFicha[]>;
  // A versão atual é a de maior número; nula se a ficha não existe.
  buscarVersaoAtual(fichaId: Identificador): Promise<VersaoDaFicha | null>;
}
