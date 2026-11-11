import type { Relogio } from '../../src/aplicacao/portas/relogio';
import { InstanteUtc } from '../../src/dominio/instante-utc';

export class RelogioFixo implements Relogio {
  constructor(private readonly iso = '2026-11-10T13:45:00.000Z') {}

  agora(): InstanteUtc {
    return InstanteUtc.de(this.iso);
  }
}
