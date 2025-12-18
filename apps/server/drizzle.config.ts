import { defineConfig } from 'drizzle-kit';
import { getDatabaseUrl } from './src/common/env';

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/modules/*/schema.ts',
  out: './drizzle',
  dbCredentials: {
    url: getDatabaseUrl(),
  },
});
