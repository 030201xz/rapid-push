/**
 * Web 服务器模块
 *
 * 导出启动函数，供主入口调用
 */

import 'reflect-metadata';
import { createApp } from './app';
import { serverConfig } from './config';
import { shutdownDatabase } from './infrastructure/database';
import { appLogger } from './infrastructure/logger';

const logger = appLogger.child('WebServer');

/**
 * 启动 Web 服务器
 *
 * @returns 关闭函数，用于优雅停机
 */
export async function startWebServer(): Promise<() => Promise<void>> {
  logger.info(`🚀 Web 服务器启动中...`, {
    port: serverConfig.port,
    environment: serverConfig.isDevelopment ? 'development' : 'production',
  });

  // 创建应用（包含数据库初始化）
  const app = await createApp();

  // 启动 Bun 服务器
  const server = Bun.serve({
    port: serverConfig.port,
    fetch: app.fetch,
    reusePort: true,
  });

  logger.info(`✅ Web 服务器已启动，监听端口: ${serverConfig.port}`);

  // 返回关闭函数
  return async () => {
    logger.info('正在关闭 Web 服务器...');
    server.stop();
    await shutdownDatabase();
    logger.info('Web 服务器已关闭');
  };
}

/** 导出配置和日志 */
export { serverConfig } from './config';
export { appLogger } from './infrastructure/logger';

// 如果直接运行此文件，则独立启动 Web 服务器
if (import.meta.main) {
  startWebServer()
    .then(shutdown => {
      // 注册关闭钩子
      process.on('SIGINT', async () => {
        logger.info('收到 SIGINT 信号，正在关闭...');
        await shutdown();
        process.exit(0);
      });

      process.on('SIGTERM', async () => {
        logger.info('收到 SIGTERM 信号，正在关闭...');
        await shutdown();
        process.exit(0);
      });
    })
    .catch(error => {
      logger.error('Web 服务器启动失败', error);
      process.exit(1);
    });
}
