import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { Glob } from 'bun';
import { dirname, isAbsolute, join, resolve } from 'node:path';
import 'reflect-metadata';
import type { InjectionToken } from 'tsyringe';
import { container } from 'tsyringe';
import {
  generateToolNames,
  isToolClass,
  MCP_SERVER_TOKEN,
  ToolCoordinator,
  type BaseTool,
} from './core/index.ts';
import { createLogger } from './shared/logger.ts';

// 从自动生成的文件导入类型（首次运行前可能不存在，使用 try-catch）
export type { ToolName } from '../.skills-mcp/tool-names.ts';

const log = createLogger('container');

/** 外部工具路径环境变量名 */
const EXTERNAL_TOOLS_ENV_KEY = 'SKILLS_MCP_TOOLS_PATH';

/**
 * 工具加载配置
 * ignore 类型从 .mcp-demo/tool-names.ts 获取自动补全
 */
export interface ToolLoaderConfig {
  /**
   * 要忽略的工具名称列表
   * 类型安全：输入 "" 时 VS Code 会提示可用的工具名称
   */
  ignore?: import('../.skills-mcp/tool-names.ts').ToolName[];
}

/** 默认配置 */
const DEFAULT_CONFIG: ToolLoaderConfig = {
  ignore: [],
};

/** 已加载的工具类及其名称缓存 */
interface LoadedTool {
  token: InjectionToken<BaseTool>;
  name: string;
}
let loadedTools: LoadedTool[] = [];

/**
 * 从指定目录扫描并加载工具类
 * 只加载 *.tool.ts 结尾的文件
 * @param toolsDir 工具目录路径
 * @param ignoreSet 忽略的工具名称集合
 */
async function scanToolsFromDirectory(
  toolsDir: string,
  ignoreSet: Set<string>,
): Promise<void> {
  // 检查目录是否存在
  const dirPath = await Bun.file(toolsDir).stat();
  if (!dirPath || !dirPath.isDirectory?.()) {
    log.debug(`工具目录不存在或非目录: ${toolsDir}`);
    return;
  }

  // 只扫描 *.tool.ts 结尾的文件
  const glob = new Glob('**/*.tool.ts');

  for await (const relativePath of glob.scan(toolsDir)) {
    const fileName = relativePath.split('/').pop() ?? '';

    // 跳过以下划线开头的文件（如 _deprecated.tool.ts）
    if (fileName.startsWith('_')) continue;

    try {
      // 动态导入模块
      const modulePath = join(toolsDir, relativePath);
      const module = await import(modulePath);

      // 遍历所有导出，只加载带 @Tool() 装饰器的类
      for (const exportName of Object.keys(module)) {
        log.info(`检查导出: ${exportName}（来自 ${relativePath}）`);
        const exported = module[exportName];

        // 核心判断：是否有 @Tool() 装饰器
        if (!isToolClass(exported)) continue;

        // 实例化获取工具名称
        const ToolClass = exported as InjectionToken<BaseTool>;
        const tempInstance = new (ToolClass as new () => BaseTool)();
        const toolName = tempInstance.getOptions().name;

        // 检查是否在忽略列表中
        if (ignoreSet.has(toolName)) {
          log.info(`⊘ 跳过工具: ${toolName}（在忽略列表中）`);
          continue;
        }

        // 检查是否已加载（避免重复）
        if (loadedTools.some(t => t.name === toolName)) {
          log.warn(
            `⚠ 工具已存在: ${toolName}（来自 ${modulePath}），跳过重复加载`,
          );
          continue;
        }

        loadedTools.push({ token: ToolClass, name: toolName });
        log.info(`✓ 已加载工具: ${toolName} (${relativePath})`);
      }
    } catch (error) {
      // *.tool.ts 文件加载失败需要警告
      const errorMsg = error instanceof Error ? error.message : String(error);
      log.warn(`⚠ 工具加载失败: ${relativePath}（${errorMsg}）`);
    }
  }
}

/**
 * 扫描并动态加载所有工具类（内部 + 外部）
 * 支持嵌套目录结构，如 tools/math/eval.ts
 * @param config 加载配置
 */
async function scanAndLoadTools(config: ToolLoaderConfig): Promise<void> {
  const internalToolsDir = join(dirname(import.meta.path), 'tools');
  const ignoreSet = new Set<string>(config.ignore ?? []);

  loadedTools = [];

  // 1. 加载内部工具
  log.info('正在加载内部工具...');
  await scanToolsFromDirectory(internalToolsDir, ignoreSet);

  // 2. 加载外部工具（仅通过环境变量指定路径）
  const externalToolsPath = process.env[EXTERNAL_TOOLS_ENV_KEY];

  if (externalToolsPath) {
    log.info(`环境变量: ${EXTERNAL_TOOLS_ENV_KEY}=${externalToolsPath}`);
    // 使用环境变量指定的路径（支持相对路径和绝对路径）
    const resolvedPath = isAbsolute(externalToolsPath)
      ? externalToolsPath
      : resolve(process.cwd(), externalToolsPath);
    log.info(
      `正在加载外部工具（${EXTERNAL_TOOLS_ENV_KEY}=${resolvedPath}）...`,
    );
    await scanToolsFromDirectory(resolvedPath, ignoreSet);
  } else {
    log.debug(`未设置 ${EXTERNAL_TOOLS_ENV_KEY} 环境变量，跳过外部工具加载`);
  }

  log.info(`共加载 ${loadedTools.length} 个工具`);
}

/**
 * 配置依赖注入容器
 * @param mcpServer MCP 服务器实例（由入口文件创建并传入）
 * @param config 工具加载配置（可选）
 */
export async function configureContainer(
  mcpServer: McpServer,
  config: ToolLoaderConfig = DEFAULT_CONFIG,
): Promise<void> {
  // 注册 MCP 服务器实例
  container.registerInstance(MCP_SERVER_TOKEN, mcpServer);

  // 注册协调者（单例）
  container.registerSingleton(ToolCoordinator);

  // 生成工具名称类型定义（供 IDE 类型推断）
  await generateToolNames();

  // 扫描并加载工具类
  await scanAndLoadTools(config);
}

/**
 * 获取所有工具实例
 */
export function resolveAllTools(): BaseTool[] {
  return loadedTools.map(({ token }) => container.resolve(token));
}

/**
 * 获取协调者实例
 */
export function resolveCoordinator(): ToolCoordinator {
  return container.resolve(ToolCoordinator);
}
