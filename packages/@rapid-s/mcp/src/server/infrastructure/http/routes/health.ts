/**
 * 健康检查路由
 */

import type { Hono } from 'hono';
import { serverConfig } from '../../../config';
import { DatabaseStatus, getDatabaseStatus } from '../../database';

/** 应用版本 */
const APP_VERSION = '1.0.0';

/**
 * 注册健康检查路由
 */
export function registerHealthRoutes(app: Hono): void {
  // 健康检查端点
  app.get('/health', async c => {
    const dbStatus = getDatabaseStatus();
    return c.json({
      status: dbStatus === DatabaseStatus.CONNECTED ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      environment: serverConfig.isDevelopment ? 'development' : 'production',
      database: dbStatus,
    });
  });

  // 根路径信息
  app.get('/', c => {
    return c.json({
      name: 'MCP PG-PGVector Demo Server',
      version: APP_VERSION,
      graphql: '/graphql',
      docs: '/graphql',
      mcp: {
        description: 'MCP 服务通过 stdio 运行，此 HTTP 服务提供辅助 API',
      },
    });
  });
}
