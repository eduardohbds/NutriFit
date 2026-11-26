import type { InstanteUtc } from '../../dominio/instante-utc';

export interface Relogio {
  agora(): InstanteUtc;
  // O dia da semana de hoje no fuso do aparelho (RB16): 1 = segunda a 7 = domingo.
  diaDaSemana(): number;
}
