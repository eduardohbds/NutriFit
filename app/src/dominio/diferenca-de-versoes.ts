import type { ItemDaRotina, SeriePlanejada, VersaoDaFicha } from './ficha';
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

export interface LinhaComparada {
  tipo: 'igual' | TipoDeMudanca;
  antes: ItemDaRotina | null;
  depois: ItemDaRotina | null;
  campos: string[];
}

export interface RotinaComparada {
  nome: string;
  situacao: 'igual' | 'adicionada' | 'removida';
  linhas: LinhaComparada[];
}

function linhaComparada(par: Par): LinhaComparada {
  const antes = par.antes ?? null;
  const depois = par.depois ?? null;
  if (!depois) return { tipo: 'removida', antes, depois, campos: [] };
  if (!antes) return { tipo: 'adicionada', antes, depois, campos: [] };
  const campos = camposAlterados(antes, depois);
  return { tipo: campos.length > 0 ? 'alterada' : 'igual', antes, depois, campos };
}

const linhasLadoALado = (antes: ItemDaRotina[], depois: ItemDaRotina[]): LinhaComparada[] =>
  alinhar(antes, depois).map(linhaComparada);

// As duas versões alinhadas, com todas as linhas (as iguais também) para mostrar lado a lado. As
// rotinas se casam pelo nome (a primeira de cada nome ainda sem par), na ordem da versão de antes,
// e as novas vêm no fim; dentro de cada uma, as linhas se casam pelo exercício e pela ordem.
// Reordenar as rotinas não conta como diferença.
export function comparacaoLadoALado(
  anterior: VersaoDaFicha,
  atual: VersaoDaFicha,
): RotinaComparada[] {
  const usadas = new Set<number>();
  const rotinas: RotinaComparada[] = [];
  for (const antes of anterior.rotinas) {
    const posicao = atual.rotinas.findIndex((r, p) => r.nome === antes.nome && !usadas.has(p));
    const depois = posicao < 0 ? [] : atual.rotinas[posicao].itens;
    if (posicao >= 0) usadas.add(posicao);
    const situacao = posicao < 0 ? 'removida' : 'igual';
    rotinas.push({ nome: antes.nome, situacao, linhas: linhasLadoALado(antes.itens, depois) });
  }
  atual.rotinas.forEach((depois, posicao) => {
    if (usadas.has(posicao)) return;
    const linhas = linhasLadoALado([], depois.itens);
    rotinas.push({ nome: depois.nome, situacao: 'adicionada', linhas });
  });
  return rotinas;
}

// Só o que mudou: as rotinas adicionadas e removidas e as linhas que não são iguais.
export function diferencaDeVersoes(
  anterior: VersaoDaFicha,
  atual: VersaoDaFicha,
): DiferencaDeVersoes {
  const comparadas = comparacaoLadoALado(anterior, atual);
  const rotinas: DiferencaDeRotina[] = comparadas
    .filter((r) => r.situacao !== 'igual')
    .map((r) => ({ nome: r.nome, tipo: r.situacao as 'adicionada' | 'removida' }));
  const linhas: DiferencaDeLinha[] = comparadas.flatMap((r) =>
    r.linhas
      .filter((l) => l.tipo !== 'igual')
      .map((l) => ({
        rotina: r.nome,
        exercicioId: (l.antes ?? l.depois)!.exercicioId,
        tipo: l.tipo as TipoDeMudanca,
        campos: l.campos,
      })),
  );
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
