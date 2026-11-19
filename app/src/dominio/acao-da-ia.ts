import type { Identificador } from './identificador';
import type { InstanteUtc } from './instante-utc';

// Registro de uma ação da IA (RF, seção 18.6). `desfeita` é a única coisa que muda depois de
// registrada (FL04); desfazer de verdade é uma versão nova da ficha (US-010), nunca edição.
export interface AcaoDaIA {
  id: Identificador;
  comando: string;
  criadaEm: InstanteUtc;
  tipo: string;
  resultado: string;
  versaoCriadaId: Identificador | null;
  resumo: string | null;
  desfeita: boolean;
}
