import { drizzle } from 'drizzle-orm/expo-sqlite';
import { openDatabaseSync } from 'expo-sqlite';

import * as esquema from './esquema';

// WAL com sincronização completa: sobrevive a fechamento forçado (arquitetura 7).
export const sqlite = openDatabaseSync('nutrifit-spike.db');
sqlite.execSync('PRAGMA journal_mode = WAL; PRAGMA synchronous = FULL;');

export const banco = drizzle(sqlite, { schema: esquema });
