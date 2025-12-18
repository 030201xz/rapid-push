/**
 * 应用入口
 *
 * 职责单一：组装 Hono 应用，挂载中间件和路由
 */

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { graphqlConfig } from './config';
import { initializeDatabase } from './infrastructure/database';
import { createGraphQLServer } from './infrastructure/graphql';
import {
  authMiddleware,
  errorHandlerMiddleware,
  loggerMiddleware,
  registerHealthRoutes,
} from './infrastructure/http';
import { appLogger } from './infrastructure/logger';
import { registerModules, resolvers } from './modules';

/** codegen 生成的合并 Schema */
const typeDefs = Bun.file('./schema.graphql').text();

/** 创建应用实例 */
export async function createApp() {
  const app = new Hono();
  const logger = appLogger.child('App');

  // 全局中间件
  app.use('*', cors());
  app.use('*', loggerMiddleware);
  app.use('*', authMiddleware);
  app.use('*', errorHandlerMiddleware);

  // 初始化
  logger.info('初始化数据库...');
  await initializeDatabase();

  logger.info('注册业务模块...');
  registerModules();

  // GraphQL 端点
  const yoga = createGraphQLServer({
    typeDefs: await typeDefs,
    resolvers,
  });
  app.on(['GET', 'POST'], graphqlConfig.endpoint, c => yoga.handle(c.req.raw));

  // HTTP 路由
  registerHealthRoutes(app);

  logger.info('应用初始化完成');
  return app;
}
