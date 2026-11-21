import { ErroDeValidacao } from './erro-de-validacao';

interface RotinaIdentificada {
  nome: string;
  diaDaSemana: number | null;
}

const tipoDe = (rotina: RotinaIdentificada) =>
  rotina.diaDaSemana === null ? 'rótulo de rotação' : 'dia da semana';

// RB01: todas as rotinas de uma ficha são identificadas do mesmo jeito. Aponta a primeira que
// destoa da primeira rotina da ficha.
export function exigirTipoUnicoDeRotina(rotinas: RotinaIdentificada[]): void {
  const referencia = rotinas.map(tipoDe)[0];
  const destoante = rotinas.find((r) => tipoDe(r) !== referencia);
  if (!destoante) return;
  throw new ErroDeValidacao(
    `rotina "${destoante.nome}"`,
    'todas as rotinas do mesmo tipo: dia da semana ou rótulo de rotação',
    tipoDe(destoante),
  );
}
