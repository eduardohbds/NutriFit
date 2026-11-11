import type { GeradorDeIdentificador } from '../../src/aplicacao/portas/gerador-de-identificador';
import { Identificador } from '../../src/dominio/identificador';

// Falso determinístico: UUID v7 válidos e crescentes, para testes legíveis.
export class GeradorDeIdentificadorSequencial implements GeradorDeIdentificador {
  private proximo = 1;

  gerar(): Identificador {
    const sufixo = String(this.proximo++).padStart(12, '0');
    return Identificador.de(`00000000-0000-7000-8000-${sufixo}`);
  }
}
