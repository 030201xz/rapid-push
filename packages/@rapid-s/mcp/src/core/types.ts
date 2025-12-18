import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import "reflect-metadata";
import type { z } from "zod";

/** 工具生命周期阶段 */
export enum ToolLifecycle {
  /** 已创建，未初始化 */
  Created = "created",
  /** 初始化中 */
  Initializing = "initializing",
  /** 已就绪，可使用 */
  Ready = "ready",
  /** 已暂停 */
  Suspended = "suspended",
  /** 销毁中 */
  Destroying = "destroying",
  /** 已销毁 */
  Destroyed = "destroyed",
}

/** 工具执行上下文 */
export interface ToolContext {
  /** 工具名称 */
  readonly toolName: string;
  /** 调用时间戳 */
  readonly timestamp: number;
}

/** 工具执行结果 */
export interface ToolResult<T = unknown> {
  /** 是否成功 */
  success: boolean;
  /** 结构化数据 */
  data?: T;
  /** 错误信息 */
  error?: string;
}

/** 工具配置选项 */
export interface ToolOptions<
  TInput extends Record<string, z.ZodType> = Record<string, z.ZodType>,
  TOutput extends Record<string, z.ZodType> = Record<string, z.ZodType>,
> {
  /** 工具唯一标识 */
  name: string;
  /** 工具显示标题 */
  title: string;
  /** 工具描述 */
  description: string;
  /** 输入参数 Schema */
  inputSchema: TInput;
  /** 输出参数 Schema */
  outputSchema: TOutput;
}

/** 工具元数据（用于装饰器） */
export interface ToolMetadata {
  name: string;
  title: string;
  description: string;
}

/** MCP 服务器上下文 */
export interface ServerContext {
  server: McpServer;
}

/** 工具注册表项 */
export interface ToolRegistryEntry {
  /** 工具实例 */
  instance: BaseTool;
  /** 生命周期状态 */
  lifecycle: ToolLifecycle;
  /** 注册时间 */
  registeredAt: number;
}

/** 工具基类抽象接口 */
export abstract class BaseTool<
  TInput extends Record<string, z.ZodType> = Record<string, z.ZodType>,
  TOutput extends Record<string, z.ZodType> = Record<string, z.ZodType>,
  TInputType = z.infer<z.ZodObject<TInput>>,
  TOutputType = z.infer<z.ZodObject<TOutput>>,
> {
  /** 当前生命周期状态 */
  protected _lifecycle: ToolLifecycle = ToolLifecycle.Created;

  /** 获取当前生命周期状态 */
  get lifecycle(): ToolLifecycle {
    return this._lifecycle;
  }

  /** 获取工具配置 */
  abstract getOptions(): ToolOptions<TInput, TOutput>;

  /**
   * 生命周期钩子：初始化
   * 在工具注册前调用，用于资源准备
   */
  async onInit(): Promise<void> {
    // 默认空实现，子类可覆盖
  }

  /**
   * 生命周期钩子：就绪
   * 工具注册完成后调用
   */
  async onReady(): Promise<void> {
    // 默认空实现，子类可覆盖
  }

  /**
   * 生命周期钩子：暂停
   * 工具被暂时禁用时调用
   */
  async onSuspend(): Promise<void> {
    // 默认空实现，子类可覆盖
  }

  /**
   * 生命周期钩子：恢复
   * 工具从暂停状态恢复时调用
   */
  async onResume(): Promise<void> {
    // 默认空实现，子类可覆盖
  }

  /**
   * 生命周期钩子：销毁
   * 工具被移除前调用，用于清理资源
   */
  async onDestroy(): Promise<void> {
    // 默认空实现，子类可覆盖
  }

  /**
   * 执行工具逻辑
   * @param input 输入参数
   * @param context 执行上下文
   */
  abstract execute(
    input: TInputType,
    context: ToolContext
  ): Promise<ToolResult<TOutputType>>;

  /** 更新生命周期状态（内部使用） */
  _setLifecycle(lifecycle: ToolLifecycle): void {
    this._lifecycle = lifecycle;
  }
}
