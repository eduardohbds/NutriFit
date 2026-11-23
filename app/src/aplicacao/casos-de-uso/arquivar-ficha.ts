import type { Identificador } from '../../dominio/identificador';
import { fichaExistente } from '../ficha-existente';
import type { RepositorioDeFichas } from '../portas/repositorio-de-fichas';

// Ficha nunca é excluída, só arquivada: sai das escolhas, e as versões e as sessões continuam no
// histórico (RB02, RB04, FI-4). Arquivar a ativa deixa o app sem ficha ativa, e arquivar a que já
// está arquivada não muda nada.
export class ArquivarFicha {
  constructor(private readonly fichas: RepositorioDeFichas) {}

  async executar(fichaId: Identificador): Promise<void> {
    const ficha = await fichaExistente(this.fichas, fichaId);
    if (ficha.situacao === 'arquivada') return;
    await this.fichas.arquivarFicha(fichaId);
  }
}
