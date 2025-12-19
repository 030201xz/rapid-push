import { app } from './app';
import { env } from './common/env';
import { logger } from './common/logger';

// ========== Bun 原生服务 ==========

Bun.serve({
  hostname: env.host,
  port: env.port,
  fetch: app.fetch,
  reusePort: true,
});

logger.info(`🚀 Server running on http://${env.host}:${env.port}`);
