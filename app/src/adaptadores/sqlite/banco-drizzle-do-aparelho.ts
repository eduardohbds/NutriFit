import { drizzle } from 'drizzle-orm/expo-sqlite';
import { openDatabaseSync } from 'expo-sqlite';

// Segunda conexão, síncrona, para os repositórios (que usam o Drizzle em modo síncrono). Só pode
// ser aberta depois de o AbrirBanco terminar: as telas ficam atrás do GuardaDoBanco. Os PRAGMAs
// valem por conexão, então repetem os da ConfigurarConexao: WAL, sincronização completa (RNF08) e
// chaves estrangeiras. Só roda no aparelho (expo-sqlite); a verificação é o N6 no Poco M5s.
export function abrirBancoDrizzleDoAparelho(nomeDoBanco: string) {
  const banco = openDatabaseSync(nomeDoBanco);
  banco.execSync('PRAGMA journal_mode = wal; PRAGMA synchronous = 2; PRAGMA foreign_keys = 1;');
  return drizzle(banco);
}
