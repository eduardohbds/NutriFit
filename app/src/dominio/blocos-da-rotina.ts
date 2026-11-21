import type { ItemDaRotina } from './ficha';

export interface BlocoDaRotina {
  grupo: string | null;
  itens: ItemDaRotina[];
}

// RB07: exercícios consecutivos com a mesma letra formam um bloco (bi-set, tri-set, circuito) e
// são executados em sequência; exercício sem letra fica sozinho no seu bloco.
export function blocosDaRotina(itens: ItemDaRotina[]): BlocoDaRotina[] {
  const blocos: BlocoDaRotina[] = [];
  for (const item of itens) {
    const ultimo = blocos[blocos.length - 1];
    if (item.grupoSequencia !== null && ultimo?.grupo === item.grupoSequencia) {
      ultimo.itens.push(item);
    } else {
      blocos.push({ grupo: item.grupoSequencia, itens: [item] });
    }
  }
  return blocos;
}

// O descanso de cada exercício é o tempo após a série dele, e descanso 0 leva direto ao exercício
// seguinte do bloco. O último exercício do bloco não tem seguinte, então descansa normalmente.
export function levaDiretoAoSeguinte(bloco: BlocoDaRotina, item: number, serie: number): boolean {
  if (bloco.grupo === null || item >= bloco.itens.length - 1) return false;
  return bloco.itens[item].series[serie]?.descansoSegundos === 0;
}
