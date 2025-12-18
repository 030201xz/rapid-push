/**
 * MCP + Web 服务器集成入口
 *
 * 同时启动：
 * 1. MCP 服务器 - 通过 stdio 与 AI 客户端通信
 * 2. Web 服务器 - 提供 HTTP/GraphQL API
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { Implementation } from '@modelcontextprotocol/sdk/types.js';
import 'reflect-metadata';
import {
  configureContainer,
  resolveAllTools,
  resolveCoordinator,
  type ToolLoaderConfig,
} from './container.ts';
// import { startWebServer } from './server/index.ts';
import { createLogger } from './shared/logger.ts';

const log = createLogger('main');

/** MCP 服务器配置 */
const MCP_SERVER_CONFIG = {
  name: 'skills-mcp',
  version: '1.0.0',
  // 包含了: 高精度计算工具、代码生成工具
  title: 'Skills MCP Server: [Decimal Calculator, Code Generator]',
} as Implementation;

/** 工具加载配置 - 在此配置要忽略的工具 */
const TOOL_LOADER_CONFIG: ToolLoaderConfig = {
  ignore: ['ignore_demo_tool'],
};

/** 是否启用 Web 服务器（通过环境变量控制） */
const ENABLE_WEB_SERVER = process.env.ENABLE_WEB_SERVER !== 'false';

/**
 * MCP + Web 服务器入口
 * 使用 tsyringe 依赖注入 + 协调者模式管理工具生命周期
 */
async function main() {
  // 存储关闭函数
  let shutdownWebServer: (() => Promise<void>) | null = null;

  // 1. 启动 Web 服务器（如果启用）
  // if (ENABLE_WEB_SERVER) {
  //   log.info('正在启动 Web 服务器...');
  //   shutdownWebServer = await startWebServer();
  // }

  // 2. 创建 MCP 服务器实例
  const mcpServer = new McpServer({
    name: MCP_SERVER_CONFIG.name,
    version: MCP_SERVER_CONFIG.version,
    title: MCP_SERVER_CONFIG.title,
  });
  log.info(
    `MCP 服务器 "${MCP_SERVER_CONFIG.name}" v${MCP_SERVER_CONFIG.version} 已创建`,
  );

  // 3. 配置 DI 容器（注入 MCP 服务器实例，自动扫描工具）
  await configureContainer(mcpServer, TOOL_LOADER_CONFIG);
  log.info('DI 容器已配置');

  // 4. 获取协调者实例
  const coordinator = resolveCoordinator();

  // 5. 解析并注册所有工具
  const tools = resolveAllTools();
  await coordinator.registerTools(tools);

  // 6. 启动 MCP 服务器（使用 stdio 传输）
  const transport = new StdioServerTransport();
  await mcpServer.connect(transport);
  log.info('MCP 服务器已启动，等待连接...');

  // 7. 优雅关闭处理
  const shutdown = async (signal: string) => {
    log.warn(`收到 ${signal} 信号，正在关闭...`);

    // 关闭 MCP 协调者
    await coordinator.shutdown();

    // 关闭 Web 服务器
    // if (shutdownWebServer) {
    //   await shutdownWebServer();
    // }

    process.exit(0);
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

main().catch(error => {
  log.error('启动失败:', error);
  process.exit(1);
});
