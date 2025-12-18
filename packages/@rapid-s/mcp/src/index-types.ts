/**
 * MCP Skills 工具系统 - 导出所有类型和工具
 *
 * 优雅的工具加载机制支持：
 * 1. 内部工具 - 位于 src/tools 目录
 * 2. 外部工具 - 通过环境变量 SKILLS_MCP_TOOLS_PATH 指定
 * 3. 类型安全的工具定义 - 使用 @injectable 和 @Tool 装饰器
 * 4. 灵活的忽略列表 - 通过 ToolLoaderConfig.ignore 配置
 */

// 导出所有核心类型和工具
export * from './core/index.ts';
export * from './shared/index.ts';
