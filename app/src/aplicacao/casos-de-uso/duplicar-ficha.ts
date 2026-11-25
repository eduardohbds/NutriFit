import { ErroDeValidacao } from '../../dominio/erro-de-validacao';
import type { Ficha, NovaVersaoDaFicha } from '../../dominio/ficha';
import type { Identificador } from '../../dominio/identificador';
import { copiarRotinas } from '../copiar-rotinas';
import { fichaExistente } from '../ficha-existente';
import type { GeradorDeIdentificador } from '../portas/gerador-de-identificador';
import type { Relogio } from '../portas/relogio';
import type { RepositorioDeFichas } from '../portas/repositorio-de-fichas';
import type { ResultadoDaFicha } from './salvar-ficha';

// Duplica a versão atual como a versão 1 de uma ficha nova, com identificadores próprios: a cópia
// tem histórico próprio e a original não é tocada (RB02, FI-4). A cópia nasce inativa.
export class DuplicarFicha {
  constructor(
    private readonly fichas: RepositorioDeFichas,
    private readonly gerador: GeradorDeIdentificador,
    private readonly relogio: Relogio,
  ) {}

  async executar(fichaId: Identificador): Promise<ResultadoDaFicha> {
    const original = await fichaExistente(this.fichas, fichaId);
    const atual = await this.fichas.buscarVersaoAtual(fichaId);
    if (!atual) throw new ErroDeValidacao('ficha', 'ficha com ao menos uma versão', fichaId.valor);
    const agora = this.relogio.agora();
    const copia: Ficha = {
      id: this.gerador.gerar(),
      nome: `${original.nome} (cópia)`,
      situacao: 'inativa',
      origem: 'duplicada',
      criadaEm: agora,
    };
    const versao: NovaVersaoDaFicha = {
      id: this.gerador.gerar(),
      autor: 'usuario',
      criadaEm: agora,
      motivo: `Duplicada de "${original.nome}"`,
      resumo: null,
      rotinas: copiarRotinas(atual.rotinas, this.gerador),
    };
    return { fichaId: copia.id, versao: await this.fichas.criarFicha(copia, versao) };
  }
}
