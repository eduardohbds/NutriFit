import type { InstanteUtc } from '../../dominio/instante-utc';

export interface Relogio {
  agora(): InstanteUtc;
}
