import { Hono } from 'hono';
import { fetchRequestHandler } from '@trpc/server/adapters/fetch';
import { createContext } from './common/trpc';
import { appRouter } from './modules';
import {
  corsMiddleware,
  loggerMiddleware,
  errorHandler,
  requestIdMiddleware,
} from './common/middleware';

// ========== 类型定义 ==========
type Variables = {
  requestId: string;
};

// ========== Hono 应用 ==========
const app = new Hono<{ Variables: Variables }>();

// ========== Hono 全局中间件（按顺序执行） ==========
app.use('*', errorHandler); // 最外层：捕获所有错误
app.use('*', requestIdMiddleware); // 注入请求 ID
app.use('*', loggerMiddleware); // 日志
app.use('*', corsMiddleware); // CORS

// ========== tRPC 挂载 ==========
app.all('/trpc/*', (c) =>
  fetchRequestHandler({
    endpoint: '/trpc',
    req: c.req.raw,
    router: appRouter,
    createContext: () => createContext(c),
  })
);

// ========== 健康检查 ==========
app.get('/health', (c) =>
  c.json({
    status: 'ok',
    requestId: c.get('requestId'),
  })
);

// ========== 根路径 ==========
app.get('/', (c) =>
  c.json({
    name: 'Rapid-S Server',
    version: '1.0.0',
    docs: '/trpc',
  })
);

export { app };
