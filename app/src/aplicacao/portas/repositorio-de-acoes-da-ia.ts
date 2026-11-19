import type { AcaoDaIA } from '../../dominio/acao-da-ia';
import type { Identificador } from '../../dominio/identificador';

// A ação registrada não é reescrita (FI-4): a única mudança permitida é a marca `desfeita`.
export interface RepositorioDeAcoesDaIA {
  registrar(acao: AcaoDaIA): Promise<void>;
  // Muda só `desfeita`. Falha, sem gravar nada, se a ação não existe.
  desfazer(id: Identificador): Promise<void>;
  buscar(id: Identificador): Promise<AcaoDaIA | null>;
}
