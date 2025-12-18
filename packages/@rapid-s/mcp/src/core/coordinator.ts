import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import "reflect-metadata";
import { inject, injectable } from "tsyringe";
import { createLogger } from "../shared/logger.ts";
import {
  BaseTool,
  ToolLifecycle,
  type ToolContext,
  type ToolRegistryEntry,
} from "./types.ts";

/** DI Token */
export const MCP_SERVER_TOKEN = Symbol("McpServer");

/** 协调者日志 */
const log = createLogger("coordinator");

/**
 * MCP 工具协调者
 * 负责管理所有工具的生命周期、注册和协调
 */
@injectable()
export class ToolCoordinator {
  /** 工具注册表 */
  private readonly registry = new Map<string, ToolRegistryEntry>();

  /** MCP 服务器实例 */
  private readonly server: McpServer;

  constructor(@inject(MCP_SERVER_TOKEN) server: McpServer) {
    this.server = server;
  }

  /**
   * 注册工具
   * @param tool 工具实例
   */
  async registerTool(tool: BaseTool): Promise<void> {
    const options = tool.getOptions();
    const { name } = options;

    // 检查重复注册
    if (this.registry.has(name)) {
      throw new Error(`[协调者] 工具 "${name}" 已注册，不能重复注册`);
    }

    // 创建注册表项
    const entry: ToolRegistryEntry = {
      instance: tool,
      lifecycle: ToolLifecycle.Created,
      registeredAt: Date.now(),
    };
    this.registry.set(name, entry);

    // 执行初始化生命周期
    await this.transitionLifecycle(name, ToolLifecycle.Initializing);
    await tool.onInit();

    // 注册到 MCP 服务器
    this.registerToMcpServer(tool);

    // 标记就绪
    await this.transitionLifecycle(name, ToolLifecycle.Ready);
    await tool.onReady();

    log.info(`✓ 工具已注册: ${name}`);
  }

  /**
   * 批量注册工具
   * @param tools 工具实例数组
   */
  async registerTools(tools: BaseTool[]): Promise<void> {
    for (const tool of tools) {
      await this.registerTool(tool);
    }
  }

  /**
   * 暂停工具
   * @param name 工具名称
   */
  async suspendTool(name: string): Promise<void> {
    const entry = this.registry.get(name);
    if (!entry) {
      throw new Error(`[协调者] 工具 "${name}" 不存在`);
    }

    if (entry.lifecycle !== ToolLifecycle.Ready) {
      throw new Error(`[协调者] 工具 "${name}" 当前状态不允许暂停`);
    }

    await this.transitionLifecycle(name, ToolLifecycle.Suspended);
    await entry.instance.onSuspend();
    log.info(`⏸ 工具已暂停: ${name}`);
  }

  /**
   * 恢复工具
   * @param name 工具名称
   */
  async resumeTool(name: string): Promise<void> {
    const entry = this.registry.get(name);
    if (!entry) {
      throw new Error(`[协调者] 工具 "${name}" 不存在`);
    }

    if (entry.lifecycle !== ToolLifecycle.Suspended) {
      throw new Error(`[协调者] 工具 "${name}" 当前状态不允许恢复`);
    }

    await entry.instance.onResume();
    await this.transitionLifecycle(name, ToolLifecycle.Ready);
    log.info(`▶ 工具已恢复: ${name}`);
  }

  /**
   * 销毁工具
   * @param name 工具名称
   */
  async destroyTool(name: string): Promise<void> {
    const entry = this.registry.get(name);
    if (!entry) {
      throw new Error(`[协调者] 工具 "${name}" 不存在`);
    }

    await this.transitionLifecycle(name, ToolLifecycle.Destroying);
    await entry.instance.onDestroy();
    await this.transitionLifecycle(name, ToolLifecycle.Destroyed);

    this.registry.delete(name);
    log.info(`✗ 工具已销毁: ${name}`);
  }

  /**
   * 获取工具状态
   * @param name 工具名称
   */
  getToolStatus(name: string): ToolLifecycle | null {
    return this.registry.get(name)?.lifecycle ?? null;
  }

  /**
   * 获取所有已注册工具的名称
   */
  getRegisteredTools(): string[] {
    return Array.from(this.registry.keys());
  }

  /**
   * 获取工具统计信息
   */
  getStats(): {
    total: number;
    ready: number;
    suspended: number;
  } {
    let ready = 0;
    let suspended = 0;

    for (const entry of this.registry.values()) {
      if (entry.lifecycle === ToolLifecycle.Ready) ready++;
      if (entry.lifecycle === ToolLifecycle.Suspended) suspended++;
    }

    return { total: this.registry.size, ready, suspended };
  }

  /**
   * 关闭服务器并销毁所有工具
   */
  async shutdown(): Promise<void> {
    log.info("正在关闭...");

    // 销毁所有工具
    for (const name of this.getRegisteredTools()) {
      await this.destroyTool(name);
    }

    log.info("已关闭");
  }

  /**
   * 将工具注册到 MCP 服务器
   */
  private registerToMcpServer(tool: BaseTool): void {
    if (!this.server) {
      throw new Error("[协调者] MCP 服务器实例未设置");
    }

    const options = tool.getOptions();

    this.server.registerTool(
      options.name,
      {
        title: options.title,
        description: options.description,
        inputSchema: options.inputSchema,
        outputSchema: options.outputSchema,
      },
      async (input) => {
        // 检查工具状态
        const entry = this.registry.get(options.name);
        if (!entry || entry.lifecycle !== ToolLifecycle.Ready) {
          return {
            content: [
              { type: "text", text: `错误: 工具 "${options.name}" 当前不可用` },
            ],
            isError: true,
          };
        }

        // 构建执行上下文
        const context: ToolContext = {
          toolName: options.name,
          timestamp: Date.now(),
        };

        try {
          const result = await tool.execute(input, context);

          if (result.success && result.data) {
            return {
              content: [{ type: "text", text: JSON.stringify(result.data) }],
              structuredContent: result.data,
            };
          } else {
            return {
              content: [{ type: "text", text: result.error ?? "未知错误" }],
              isError: true,
            };
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : "执行异常";
          return {
            content: [{ type: "text", text: `错误: ${message}` }],
            isError: true,
          };
        }
      }
    );
  }

  /**
   * 状态转换
   */
  private async transitionLifecycle(
    name: string,
    newState: ToolLifecycle
  ): Promise<void> {
    const entry = this.registry.get(name);
    if (!entry) return;

    entry.lifecycle = newState;
    entry.instance._setLifecycle(newState);
  }
}
