// Mesma regra para ordenar, buscar e comparar sinônimos: sem acento, sem maiúscula e sem espaço nas
// pontas. String.normalize evita depender de Intl no aparelho.
export function chaveDeBusca(texto: string): string {
  const semAcento = texto.normalize('NFD').replace(/[̀-ͯ]/g, '');
  return semAcento.toLowerCase().trim();
}

export function compararPorNome(a: string, b: string): number {
  const x = chaveDeBusca(a);
  const y = chaveDeBusca(b);
  return x < y ? -1 : x > y ? 1 : 0;
}
