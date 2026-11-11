import { ErroDeValidacao } from './erro-de-validacao';

const LIBRAS_POR_QUILO = 2.20462;
const GRAMAS_POR_QUILO = 1000;

// Carga guardada em gramas inteiros; kg e lb só na exibição (arquitetura 7.1, seção 13.7).
// Arredondar ao grama na entrada torna a ida e volta kg ↔ lb estável, e recordes não oscilam.
export class Carga {
  private constructor(readonly gramas: number) {}

  static deGramas(gramas: number): Carga {
    if (!Number.isInteger(gramas) || gramas < 0) {
      throw new ErroDeValidacao('carga', 'inteiro de gramas ≥ 0', gramas);
    }
    return new Carga(gramas);
  }

  static deQuilos(quilos: number): Carga {
    return Carga.deGramas(Math.round(quilos * GRAMAS_POR_QUILO));
  }

  static deLibras(libras: number): Carga {
    return Carga.deQuilos(libras / LIBRAS_POR_QUILO);
  }

  emQuilos(): number {
    return this.gramas / GRAMAS_POR_QUILO;
  }

  emLibras(): number {
    return this.emQuilos() * LIBRAS_POR_QUILO;
  }

  igual(outra: Carga): boolean {
    return this.gramas === outra.gramas;
  }
}
