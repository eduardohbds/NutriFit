import type { RepositorioDeFichas } from '../../src/aplicacao/portas/repositorio-de-fichas';
import { ErroDeValidacao } from '../../src/dominio/erro-de-validacao';
import type { Ficha, NovaVersaoDaFicha, VersaoDaFicha } from '../../src/dominio/ficha';
import type { Identificador } from '../../src/dominio/identificador';

// Cópia na entrada e na saída: quem recebe um objeto não consegue alterar o que está guardado.
// Identificador, Carga e InstanteUtc são imutáveis e podem ser compartilhados.
function copiar(versao: VersaoDaFicha): VersaoDaFicha {
  return {
    ...versao,
    rotinas: versao.rotinas.map((rotina) => ({
      ...rotina,
      itens: rotina.itens.map((item) => ({
        ...item,
        series: item.series.map((serie) => ({ ...serie, meta: { ...serie.meta } })),
      })),
    })),
  };
}

export class RepositorioDeFichasEmMemoria implements RepositorioDeFichas {
  private readonly fichasGravadas = new Map<string, Ficha>();
  private readonly versoesPorFicha = new Map<string, VersaoDaFicha[]>();

  async criarFicha(ficha: Ficha, primeiraVersao: NovaVersaoDaFicha): Promise<VersaoDaFicha> {
    this.fichasGravadas.set(ficha.id.valor, { ...ficha });
    this.versoesPorFicha.set(ficha.id.valor, []);
    return this.salvarNovaVersao(ficha.id, primeiraVersao);
  }

  async salvarNovaVersao(
    fichaId: Identificador,
    versao: NovaVersaoDaFicha,
  ): Promise<VersaoDaFicha> {
    const versoes = this.versoesPorFicha.get(fichaId.valor);
    if (!versoes) throw new ErroDeValidacao('ficha', 'ficha existente', fichaId.valor);
    const gravada = copiar({ ...versao, fichaId, numero: versoes.length + 1 });
    versoes.push(gravada);
    return copiar(gravada);
  }

  async listarFichas(): Promise<Ficha[]> {
    return [...this.fichasGravadas.values()].map((ficha) => ({ ...ficha }));
  }

  async ativarFicha(fichaId: Identificador): Promise<void> {
    this.existente(fichaId);
    for (const [id, ficha] of this.fichasGravadas) {
      if (ficha.situacao === 'ativa')
        this.fichasGravadas.set(id, { ...ficha, situacao: 'inativa' });
    }
    this.mudarSituacao(fichaId, 'ativa');
  }

  async arquivarFicha(fichaId: Identificador): Promise<void> {
    this.existente(fichaId);
    this.mudarSituacao(fichaId, 'arquivada');
  }

  async listarVersoes(fichaId: Identificador): Promise<VersaoDaFicha[]> {
    return (this.versoesPorFicha.get(fichaId.valor) ?? []).map(copiar);
  }

  async buscarVersaoAtual(fichaId: Identificador): Promise<VersaoDaFicha | null> {
    const versoes = await this.listarVersoes(fichaId);
    return versoes.at(-1) ?? null;
  }

  private existente(fichaId: Identificador): Ficha {
    const ficha = this.fichasGravadas.get(fichaId.valor);
    if (!ficha) throw new ErroDeValidacao('ficha', 'ficha existente', fichaId.valor);
    return ficha;
  }

  private mudarSituacao(fichaId: Identificador, situacao: Ficha['situacao']): void {
    this.fichasGravadas.set(fichaId.valor, { ...this.existente(fichaId), situacao });
  }
}
