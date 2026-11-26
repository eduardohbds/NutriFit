import type { Relogio } from '../../src/aplicacao/portas/relogio';
import { InstanteUtc } from '../../src/dominio/instante-utc';

export class RelogioFixo implements Relogio {
  constructor(private readonly iso = '2026-11-10T13:45:00.000Z') {}

  // O dublê usa o dia em UTC do instante fixo, para o resultado não depender do fuso de quem roda.
  diaDaSemana(): number {
    const dia = new Date(this.iso).getUTCDay();
    return dia === 0 ? 7 : dia;
  }

  agora(): InstanteUtc {
    return InstanteUtc.de(this.iso);
  }
}
