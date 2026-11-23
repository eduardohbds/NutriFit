import { ErroDeValidacao } from '../../dominio/erro-de-validacao';
import type { Identificador } from '../../dominio/identificador';
import { fichaExistente } from '../ficha-existente';
import type { RepositorioDeFichas } from '../portas/repositorio-de-fichas';

const ESPERADO = 'ficha ativa ou inativa (a arquivada não volta a ser ativada: duplique-a)';

// Só uma ficha fica ativa por vez (SL09, decisão do usuário): a anterior volta a inativa. Ativar a
// que já está ativa não muda nada, e a arquivada é recusada.
export class AtivarFicha {
  constructor(private readonly fichas: RepositorioDeFichas) {}

  async executar(fichaId: Identificador): Promise<void> {
    const ficha = await fichaExistente(this.fichas, fichaId);
    if (ficha.situacao === 'arquivada') {
      throw new ErroDeValidacao('ficha', ESPERADO, ficha.situacao);
    }
    if (ficha.situacao === 'ativa') return;
    await this.fichas.ativarFicha(fichaId);
  }
}
