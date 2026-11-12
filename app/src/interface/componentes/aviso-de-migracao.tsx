import { Text } from 'react-native';

import type { SituacaoDaMigracao } from '../../aplicacao/casos-de-uso/migrar-banco';
import { textos } from '../textos';

// CE63: quando a migração não conclui, o usuário é informado e os dados anteriores seguem valendo.
export function AvisoDeMigracao({ situacao }: { situacao: SituacaoDaMigracao }) {
  if (situacao === 'migrado') return null;
  const mensagem =
    situacao === 'revertido' ? textos.migracao.revertida : textos.migracao.naoMigrada;
  return <Text role="alert">{mensagem}</Text>;
}
