import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

// Tabela mínima só para provar que a migração roda na abertura (spike).
export const teste = sqliteTable('teste', {
  id: text('id').primaryKey(),
  criadoEm: text('criado_em').notNull(),
  carga: integer('carga_gramas').notNull(),
});
