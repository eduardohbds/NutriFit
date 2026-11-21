import { ErroDeValidacao } from './erro-de-validacao';

export interface ItemComGrupo {
  ordem: number;
  grupo: string | null;
}

interface ItemAgrupado {
  ordem: number;
  grupo: string;
}

const LETRA = /^[A-Z]$/;
const SO_UM = 'ao menos dois exercícios consecutivos com a mesma letra';

function erroDeGrupo(rotina: string, ordem: number, esperado: string, recebido: string) {
  return new ErroDeValidacao(`${rotina}, linha ${ordem}: grupo`, esperado, recebido);
}

// Trechos de exercícios consecutivos com a mesma letra, na ordem da rotina.
function trechosDeGrupo(itens: ItemComGrupo[]): ItemAgrupado[][] {
  const trechos: ItemAgrupado[][] = [];
  let anterior: string | null = null;
  for (const { ordem, grupo } of itens) {
    if (grupo !== null && grupo === anterior) trechos[trechos.length - 1].push({ ordem, grupo });
    else if (grupo !== null) trechos.push([{ ordem, grupo }]);
    anterior = grupo;
  }
  return trechos;
}

// VE17: cada letra é usada em ao menos dois exercícios consecutivos da mesma rotina, e só neles.
// O erro aponta a linha do primeiro exercício que destoa.
export function exigirGruposEmSequencia(rotina: string, itens: ItemComGrupo[]): void {
  const ordenados = [...itens].sort((a, b) => a.ordem - b.ordem);
  for (const { ordem, grupo } of ordenados) {
    if (grupo !== null && !LETRA.test(grupo)) {
      throw erroDeGrupo(rotina, ordem, 'uma letra de A a Z', grupo);
    }
  }
  const usadas = new Set<string>();
  for (const trecho of trechosDeGrupo(ordenados)) {
    const { ordem, grupo } = trecho[0];
    if (trecho.length < 2) {
      throw erroDeGrupo(rotina, ordem, SO_UM, grupo);
    }
    if (usadas.has(grupo)) {
      throw erroDeGrupo(rotina, ordem, 'a mesma letra só em exercícios consecutivos', grupo);
    }
    usadas.add(grupo);
  }
}
