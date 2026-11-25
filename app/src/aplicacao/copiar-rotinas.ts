import type { ItemDaRotina, Rotina, SeriePlanejada } from '../dominio/ficha';
import type { GeradorDeIdentificador } from './portas/gerador-de-identificador';

// Cópia do conteúdo com identificadores novos em tudo (rotina, item e série): quem copia não reparte
// nada com a original, e versões gravadas continuam sem ser tocadas (RB02, FI-4).
export function copiarRotinas(rotinas: Rotina[], gerador: GeradorDeIdentificador): Rotina[] {
  const copiarSerie = (serie: SeriePlanejada): SeriePlanejada => ({
    ...serie,
    id: gerador.gerar(),
    meta: { ...serie.meta },
  });
  const copiarItem = (item: ItemDaRotina): ItemDaRotina => ({
    ...item,
    id: gerador.gerar(),
    series: item.series.map(copiarSerie),
  });
  return rotinas.map((rotina) => ({
    ...rotina,
    id: gerador.gerar(),
    itens: rotina.itens.map(copiarItem),
  }));
}
