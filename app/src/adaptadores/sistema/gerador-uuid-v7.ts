import { v7 } from 'uuid';

import type { GeradorDeIdentificador } from '../../aplicacao/portas/gerador-de-identificador';
import { Identificador } from '../../dominio/identificador';

export class GeradorUuidV7 implements GeradorDeIdentificador {
  gerar(): Identificador {
    return Identificador.de(v7());
  }
}
