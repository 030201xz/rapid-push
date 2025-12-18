import { app } from './app';
import { env } from './common/env';
import { logger } from './common/logger';

// ========== Bun 原生服务 ==========

Bun.serve({
  hostname: '0.0.0.0',
  port: env.port,
  fetch: app.fetch,
  reusePort: true,
});

logger.info(`🚀 Server running on http://0.0.0.0:${env.port}`);
