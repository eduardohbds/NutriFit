import { ErroDeValidacao } from '../../dominio/erro-de-validacao';
import type {
  Ficha,
  ItemDaRotina,
  NovaVersaoDaFicha,
  Rotina,
  SeriePlanejada,
} from '../../dominio/ficha';
import type { Identificador } from '../../dominio/identificador';
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
      rotinas: atual.rotinas.map((rotina) => this.copiarRotina(rotina)),
    };
    return { fichaId: copia.id, versao: await this.fichas.criarFicha(copia, versao) };
  }

  private copiarRotina(rotina: Rotina): Rotina {
    const itens = rotina.itens.map((item) => this.copiarItem(item));
    return { ...rotina, id: this.gerador.gerar(), itens };
  }

  private copiarItem(item: ItemDaRotina): ItemDaRotina {
    const series = item.series.map((serie) => this.copiarSerie(serie));
    return { ...item, id: this.gerador.gerar(), series };
  }

  private copiarSerie(serie: SeriePlanejada): SeriePlanejada {
    return { ...serie, id: this.gerador.gerar(), meta: { ...serie.meta } };
  }
}
