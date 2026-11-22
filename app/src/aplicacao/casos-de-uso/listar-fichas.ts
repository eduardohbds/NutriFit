import { ErroDeValidacao } from '../../dominio/erro-de-validacao';
import type { Ficha, SituacaoDaFicha } from '../../dominio/ficha';
import type { Identificador } from '../../dominio/identificador';
import { compararPorNome } from '../../dominio/texto-de-busca';
import type { RepositorioDeFichas } from '../portas/repositorio-de-fichas';

export interface FichaDaLista {
  id: Identificador;
  nome: string;
  situacao: SituacaoDaFicha;
  versaoAtual: number;
}

// A ativa primeiro e as demais por nome, como no catálogo.
function ativaPrimeiro(a: FichaDaLista, b: FichaDaLista): number {
  const pesoDeAtiva = (ficha: FichaDaLista) => (ficha.situacao === 'ativa' ? 0 : 1);
  return pesoDeAtiva(a) - pesoDeAtiva(b) || compararPorNome(a.nome, b.nome);
}

// Fichas para a tela: as arquivadas saem das escolhas, mas continuam guardadas, com suas versões e
// sessões (RB02, RB04). Só leitura.
export class ListarFichas {
  constructor(private readonly fichas: RepositorioDeFichas) {}

  async executar(): Promise<FichaDaLista[]> {
    const todas = await this.fichas.listarFichas();
    const escolhas = todas.filter((ficha) => ficha.situacao !== 'arquivada');
    const lista = await Promise.all(escolhas.map((ficha) => this.daLista(ficha)));
    return lista.sort(ativaPrimeiro);
  }

  // Toda ficha nasce com a versão 1; sem versão o banco está inconsistente, e a falha chega ao
  // limite de erro em vez de esconder a ficha.
  private async daLista(ficha: Ficha): Promise<FichaDaLista> {
    const versao = await this.fichas.buscarVersaoAtual(ficha.id);
    if (!versao) {
      throw new ErroDeValidacao('ficha', 'ficha com ao menos uma versão', ficha.id.valor);
    }
    const { id, nome, situacao } = ficha;
    return { id, nome, situacao, versaoAtual: versao.numero };
  }
}
