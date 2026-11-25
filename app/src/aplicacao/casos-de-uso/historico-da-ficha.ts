import { diferencaDeVersoes, resumoDaDiferenca } from '../../dominio/diferenca-de-versoes';
import type { AutorDaVersao, VersaoDaFicha } from '../../dominio/ficha';
import type { Identificador } from '../../dominio/identificador';
import type { InstanteUtc } from '../../dominio/instante-utc';
import { fichaExistente } from '../ficha-existente';
import type { RepositorioDeFichas } from '../portas/repositorio-de-fichas';

export interface EntradaDoHistorico {
  numero: number;
  autor: AutorDaVersao;
  criadaEm: InstanteUtc;
  motivo: string | null;
  // A diferença desta versão em relação à anterior; a primeira é "Versão inicial".
  resumo: string;
  podeRestaurar: boolean;
}

// As versões da ficha em ordem, com o resumo calculado ao ler (nada é gravado) e a indicação de
// quais podem ser restauradas: todas menos a atual, e nenhuma se há uma só. Só leitura (FI-4).
export class HistoricoDaFicha {
  constructor(private readonly fichas: RepositorioDeFichas) {}

  async executar(fichaId: Identificador): Promise<EntradaDoHistorico[]> {
    await fichaExistente(this.fichas, fichaId);
    const versoes = await this.fichas.listarVersoes(fichaId);
    return versoes.map((versao, posicao) => ({
      numero: versao.numero,
      autor: versao.autor,
      criadaEm: versao.criadaEm,
      motivo: versao.motivo,
      resumo: this.resumoDe(versoes[posicao - 1], versao),
      podeRestaurar: posicao < versoes.length - 1,
    }));
  }

  private resumoDe(anterior: VersaoDaFicha | undefined, versao: VersaoDaFicha): string {
    if (!anterior) return 'Versão inicial';
    return resumoDaDiferenca(diferencaDeVersoes(anterior, versao));
  }
}
