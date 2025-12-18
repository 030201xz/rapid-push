/**
 * DDD Use-Case Generator Tool
 *
 * MCP 工具入口
 * 批量生成 Application 层 Use-Case 代码：
 * - DTO Schema (input.schema.ts, output.schema.ts)
 * - Command/Query 类
 * - Handler 类
 */

import "reflect-metadata";
import { injectable } from "tsyringe";

import { UseCaseGenerationOrchestrator } from "./core";
import { InputParser } from "./parser";
import {
  CommandRenderer,
  HandlerRenderer,
  IndexRenderer,
  QueryRenderer,
  SchemaRenderer,
} from "./renderer";
import {
  inputSchema,
  outputSchema,
  type InputType,
  type OutputType,
} from "./types";
import { FileWriter } from "./writer";
import { createLogger } from "@/shared";
import { Tool, BaseTool, ToolOptions, ToolContext, ToolResult } from "@/core";

const log = createLogger("tool:ddd-use-case-generator");

// ============================================================================
// 配置项（手动配置，不由用户传参）
// ============================================================================

/** 生成文件的后缀名，会在所有生成文件名后面拼接，便于逐个 Review */
const FILE_SUFFIX = ".keep";

// ============================================================================
// MCP 工具定义
// ============================================================================

@injectable()
@Tool()
export class DddUseCaseGeneratorTool extends BaseTool<
  typeof inputSchema,
  typeof outputSchema,
  InputType,
  OutputType
> {
  private orchestrator!: UseCaseGenerationOrchestrator;

  // 工具配置
  override getOptions(): ToolOptions<typeof inputSchema, typeof outputSchema> {
    return {
      name: "ddd_use_case_generator",
      title: "DDD Use-Case Generator (DDD 用例代码生成器)",
      description:
        "Batch generate DDD Application layer Use-Case code from structured input. " +
        "Generates input.schema.ts, output.schema.ts, command/query, and handler for each operation. " +
        "Supports field definitions or schema references. " +
        "Uses pipeline architecture: Parser → Renderer → Writer. " +
        "(批量生成 DDD Application 层 Use-Case 代码。" +
        "根据结构化输入生成 input.schema.ts、output.schema.ts、command/query 和 handler。" +
        "支持字段定义或 Schema 引用。采用管道架构设计。)",
      inputSchema,
      outputSchema,
    };
  }

  // 初始化钩子
  override async onInit(): Promise<void> {
    log.debug("DDD Use-Case Generator 初始化中...");

    // 组装依赖，传递后缀名配置
    this.orchestrator = new UseCaseGenerationOrchestrator(
      new InputParser(),
      new SchemaRenderer(),
      new IndexRenderer(),
      new CommandRenderer(),
      new QueryRenderer(),
      new HandlerRenderer(),
      new FileWriter(),
      FILE_SUFFIX
    );
  }

  // 就绪钩子
  override async onReady(): Promise<void> {
    log.debug("DDD Use-Case Generator 就绪");
  }

  // 核心执行逻辑
  override async execute(
    input: InputType,
    _context: ToolContext
  ): Promise<ToolResult<OutputType>> {
    try {
      const result = await this.orchestrator.execute(input);

      // 检查是否有错误
      const hasErrors = result.summary.includes("## ⚠️ 错误");

      return {
        success: !hasErrors,
        data: result,
        ...(hasErrors && { error: "部分文件生成失败，请查看 summary 详情" }),
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      log.error(`生成失败: ${errorMessage}`);

      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  // 销毁钩子
  override async onDestroy(): Promise<void> {
    log.debug("DDD Use-Case Generator 销毁");
  }
}
