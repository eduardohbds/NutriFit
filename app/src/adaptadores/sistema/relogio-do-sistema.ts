import type { Relogio } from '../../aplicacao/portas/relogio';
import { InstanteUtc } from '../../dominio/instante-utc';

export class RelogioDoSistema implements Relogio {
  // Dia local do aparelho (RB16): o getDay do JavaScript vai de domingo (0) a sábado (6).
  diaDaSemana(): number {
    const dia = new Date().getDay();
    return dia === 0 ? 7 : dia;
  }

  agora(): InstanteUtc {
    return InstanteUtc.de(new Date().toISOString());
  }
}
