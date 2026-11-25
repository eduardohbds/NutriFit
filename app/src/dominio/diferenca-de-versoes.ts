import type { ItemDaRotina, Rotina, SeriePlanejada, VersaoDaFicha } from './ficha';
import type { Identificador } from './identificador';

export type TipoDeMudanca = 'adicionada' | 'removida' | 'alterada';

export interface DiferencaDeRotina {
  nome: string;
  tipo: 'adicionada' | 'removida';
}

export interface DiferencaDeLinha {
  rotina: string;
  exercicioId: Identificador;
  tipo: TipoDeMudanca;
  // Só na linha alterada: os campos que mudaram, sempre na mesma ordem.
  campos: string[];
}

export interface DiferencaDeVersoes {
  rotinas: DiferencaDeRotina[];
  linhas: DiferencaDeLinha[];
}

type Par = { antes?: ItemDaRotina; depois?: ItemDaRotina };

// Compara as séries uma a uma, só até a menor quantidade: a quantidade em si é o campo "séries".
function diferem(a: ItemDaRotina, b: ItemDaRotina, ler: (serie: SeriePlanejada) => unknown) {
  const comuns = Math.min(a.series.length, b.series.length);
  const lidas = (item: ItemDaRotina) => item.series.slice(0, comuns).map(ler);
  return JSON.stringify(lidas(a)) !== JSON.stringify(lidas(b));
}

// Os campos mudados, sempre nesta ordem.
function camposAlterados(a: ItemDaRotina, b: ItemDaRotina): string[] {
  const verificacoes: [string, boolean][] = [
    ['séries', a.series.length !== b.series.length],
    ['meta', diferem(a, b, (s) => s.meta)],
    ['carga', diferem(a, b, (s) => s.carga?.gramas ?? null)],
    ['técnica', diferem(a, b, (s) => s.tecnica)],
    ['descanso', diferem(a, b, (s) => s.descansoSegundos)],
    ['grupo', a.grupoSequencia !== b.grupoSequencia],
    ['unilateral', a.unilateral !== b.unilateral],
    ['observações', a.observacoes !== b.observacoes],
  ];
  return verificacoes.filter(([, mudou]) => mudou).map(([campo]) => campo);
}

// Casa as linhas pelo exercício e pela ordem (subsequência comum mais longa): o que sobra do lado
// de antes foi removido, e o que sobra do lado de depois foi adicionado.
function alinhar(antes: ItemDaRotina[], depois: ItemDaRotina[]): Par[] {
  const mesmo = (i: number, j: number) =>
    antes[i].exercicioId.valor === depois[j].exercicioId.valor;
  const comum = Array.from({ length: antes.length + 1 }, () =>
    new Array<number>(depois.length + 1).fill(0),
  );
  for (let i = antes.length - 1; i >= 0; i--) {
    for (let j = depois.length - 1; j >= 0; j--) {
      comum[i][j] = mesmo(i, j)
        ? comum[i + 1][j + 1] + 1
        : Math.max(comum[i + 1][j], comum[i][j + 1]);
    }
  }
  const pares: Par[] = [];
  let i = 0;
  let j = 0;
  while (i < antes.length || j < depois.length) {
    if (i < antes.length && j < depois.length && mesmo(i, j)) {
      pares.push({ antes: antes[i++], depois: depois[j++] });
    } else if (j >= depois.length || (i < antes.length && comum[i + 1][j] >= comum[i][j + 1])) {
      pares.push({ antes: antes[i++] });
    } else {
      pares.push({ depois: depois[j++] });
    }
  }
  return pares;
}

function linhasDaRotina(
  nome: string,
  antes: Rotina | null,
  depois: Rotina | null,
): DiferencaDeLinha[] {
  const linhas: DiferencaDeLinha[] = [];
  for (const par of alinhar(antes?.itens ?? [], depois?.itens ?? [])) {
    const base = { rotina: nome, exercicioId: (par.antes ?? par.depois)!.exercicioId };
    if (!par.depois) linhas.push({ ...base, tipo: 'removida', campos: [] });
    else if (!par.antes) linhas.push({ ...base, tipo: 'adicionada', campos: [] });
    else {
      const campos = camposAlterados(par.antes, par.depois);
      if (campos.length > 0) linhas.push({ ...base, tipo: 'alterada', campos });
    }
  }
  return linhas;
}

// As rotinas se casam pelo nome (a primeira de cada nome ainda sem par); dentro de cada uma, as
// linhas se casam pelo exercício e pela ordem. Reordenar as rotinas não conta como diferença.
export function diferencaDeVersoes(
  anterior: VersaoDaFicha,
  atual: VersaoDaFicha,
): DiferencaDeVersoes {
  const usadas = new Set<number>();
  const rotinas: DiferencaDeRotina[] = [];
  const linhas: DiferencaDeLinha[] = [];
  for (const antes of anterior.rotinas) {
    const posicao = atual.rotinas.findIndex((r, p) => r.nome === antes.nome && !usadas.has(p));
    if (posicao < 0) rotinas.push({ nome: antes.nome, tipo: 'removida' });
    else usadas.add(posicao);
    linhas.push(...linhasDaRotina(antes.nome, antes, posicao < 0 ? null : atual.rotinas[posicao]));
  }
  atual.rotinas.forEach((depois, posicao) => {
    if (usadas.has(posicao)) return;
    rotinas.push({ nome: depois.nome, tipo: 'adicionada' });
    linhas.push(...linhasDaRotina(depois.nome, null, depois));
  });
  return { rotinas, linhas };
}

const contagem = (quantidade: number, singular: string, plural: string): string | null =>
  quantidade === 0 ? null : `${quantidade} ${quantidade === 1 ? singular : plural}`;

// Alteradas, adicionadas e removidas, nessa ordem; as rotinas vêm antes das linhas.
export function resumoDaDiferenca(diferenca: DiferencaDeVersoes): string {
  const rotinas = (tipo: string) => diferenca.rotinas.filter((r) => r.tipo === tipo).length;
  const linhas = (tipo: string) => diferenca.linhas.filter((l) => l.tipo === tipo).length;
  const partes = [
    contagem(rotinas('adicionada'), 'rotina adicionada', 'rotinas adicionadas'),
    contagem(rotinas('removida'), 'rotina removida', 'rotinas removidas'),
    contagem(linhas('alterada'), 'linha alterada', 'linhas alteradas'),
    contagem(linhas('adicionada'), 'linha adicionada', 'linhas adicionadas'),
    contagem(linhas('removida'), 'linha removida', 'linhas removidas'),
  ].filter((parte): parte is string => parte !== null);
  return partes.length === 0 ? 'Sem diferenças' : partes.join(', ');
}
