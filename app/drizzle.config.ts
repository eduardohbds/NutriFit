import { defineConfig } from 'drizzle-kit';

// Migrações SQL geradas em drizzle/; o driver expo também gera o migrations.js que o app empacota.
export default defineConfig({
  dialect: 'sqlite',
  driver: 'expo',
  schema: './src/adaptadores/sqlite/esquema.ts',
  out: './drizzle',
});
