import { ErroDeValidacao } from '../../dominio/erro-de-validacao';
import type { NovaVersaoDaFicha } from '../../dominio/ficha';
import type { Identificador } from '../../dominio/identificador';
import { copiarRotinas } from '../copiar-rotinas';
import { fichaExistente } from '../ficha-existente';
import type { GeradorDeIdentificador } from '../portas/gerador-de-identificador';
import type { Relogio } from '../portas/relogio';
import type { RepositorioDeFichas } from '../portas/repositorio-de-fichas';
import type { ResultadoDaFicha } from './salvar-ficha';

export interface PedidoDeRestauracao {
  fichaId: Identificador;
  numero: number;
}

// Desfazer nunca apaga: restaurar grava uma versão nova com o conteúdo da escolhida, e todas as
// versões continuam no histórico (FL04, RB02, FI-4). O nome da ficha não volta, porque é da ficha.
export class RestaurarVersao {
  constructor(
    private readonly fichas: RepositorioDeFichas,
    private readonly gerador: GeradorDeIdentificador,
    private readonly relogio: Relogio,
  ) {}

  async executar({ fichaId, numero }: PedidoDeRestauracao): Promise<ResultadoDaFicha> {
    await fichaExistente(this.fichas, fichaId);
    const versoes = await this.fichas.listarVersoes(fichaId);
    const atual = versoes[versoes.length - 1];
    const escolhida = versoes.find((versao) => versao.numero === numero);
    if (!escolhida) {
      throw new ErroDeValidacao(
        'versão',
        `versão existente da ficha (1 a ${atual.numero})`,
        numero,
      );
    }
    if (escolhida.numero === atual.numero) {
      throw new ErroDeValidacao('versão', 'versão anterior à atual', numero);
    }
    const nova: NovaVersaoDaFicha = {
      id: this.gerador.gerar(),
      autor: 'usuario',
      criadaEm: this.relogio.agora(),
      motivo: `Restaurada a versão ${numero}`,
      resumo: null,
      rotinas: copiarRotinas(escolhida.rotinas, this.gerador),
    };
    return { fichaId, versao: await this.fichas.salvarNovaVersao(fichaId, nova) };
  }
}
