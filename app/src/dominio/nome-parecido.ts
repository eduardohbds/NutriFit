import { chaveDeBusca } from './texto-de-busca';

// Distância de Levenshtein com duas linhas: o número mínimo de letras a inserir, tirar ou trocar.
function distanciaDeEdicao(a: string, b: string): number {
  let anterior = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const atual = [i];
    for (let j = 1; j <= b.length; j++) {
      const custo = a[i - 1] === b[j - 1] ? 0 : 1;
      atual[j] = Math.min(anterior[j] + 1, atual[j - 1] + 1, anterior[j - 1] + custo);
    }
    anterior = atual;
  }
  return anterior[b.length];
}

// Igual depois de ignorar caixa, acento e espaços nas pontas, ou a poucas letras de distância. O
// limite cresce com o nome (um sexto do maior): nomes curtos só avisam quando são iguais, para
// "Leg" e "Lag" não se confundirem, e nomes longos toleram erro de digitação (RB35).
export function nomesParecidos(a: string, b: string): boolean {
  const x = chaveDeBusca(a);
  const y = chaveDeBusca(b);
  if (x === y) return true;
  const limite = Math.floor(Math.max(x.length, y.length) / 6);
  return distanciaDeEdicao(x, y) <= limite;
}
