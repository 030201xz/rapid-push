import { app } from './app';
import { env } from './common/env';

// ========== Bun 原生服务 ==========

Bun.serve({
  port: env.PORT,
  fetch: app.fetch,
  reusePort: true,
});

console.log(`🚀 Server running on http://localhost:${env.PORT}`);
