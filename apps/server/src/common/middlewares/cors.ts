/**
 * CORS 中间件
 */

import { cors } from 'hono/cors';
import { env } from '../env';

export const corsMiddleware = cors({
  origin: env.nodeEnv === 'production' ? ['https://your-domain.com'] : '*',
  credentials: true,
});
