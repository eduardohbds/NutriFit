import type { Identificador } from '../../dominio/identificador';

export interface GeradorDeIdentificador {
  gerar(): Identificador;
}
