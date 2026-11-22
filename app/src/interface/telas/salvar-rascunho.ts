import type {
  FichaParaEdicao,
  LerFichaParaEdicao,
} from '../../aplicacao/casos-de-uso/ler-ficha-para-edicao';
import type { SalvarFicha } from '../../aplicacao/casos-de-uso/salvar-ficha';
import { pedidoDoRascunho, type RascunhoDaFicha } from '../../aplicacao/rascunho-da-ficha';
import { ErroDeValidacao } from '../../dominio/erro-de-validacao';
import { textos } from '../textos';

export type ResultadoDoSalvamento =
  { aviso: string } | { numero: number; ficha: FichaParaEdicao | null };

// Regra de validação vira aviso na tela, com a rotina e a linha; qualquer outra falha sobe para o
// limite de erro, que registra e avisa (nunca engolir).
export async function salvarRascunho(
  salvarFicha: SalvarFicha,
  lerFicha: LerFichaParaEdicao,
  rascunho: RascunhoDaFicha,
  motivo: string,
): Promise<ResultadoDoSalvamento> {
  try {
    const { fichaId, versao } = await salvarFicha.executar(pedidoDoRascunho(rascunho, motivo));
    return { numero: versao.numero, ficha: await lerFicha.executar(fichaId) };
  } catch (erro) {
    if (!(erro instanceof ErroDeValidacao)) throw erro;
    const { campo, recebido, esperado } = erro;
    return { aviso: textos.fichas.avisoDeLinha(campo, String(recebido), esperado) };
  }
}
