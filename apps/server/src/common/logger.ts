import { createLogger } from '@rapid-s/logger';
import { env } from './env';

// ========== 全局 Logger 实例 ==========
export const logger = createLogger({
  level: env.logLevel,
  format: env.nodeEnv === 'production' ? 'json' : 'pretty',
  timestamp: true,
  color: env.nodeEnv !== 'production',
  namespace: 'Server',
});

// ========== 模块化子 Logger ==========

export const apiLogger = createLogger({namespace: 'API'});
export const dbLogger = createLogger({namespace: 'Database'});
export const trpcLogger = createLogger({namespace: 'tRPC'});