import type { Relogio } from '../../aplicacao/portas/relogio';
import { InstanteUtc } from '../../dominio/instante-utc';

export class RelogioDoSistema implements Relogio {
  agora(): InstanteUtc {
    return InstanteUtc.de(new Date().toISOString());
  }
}
