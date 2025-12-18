/**
 * 领域分析器 MCP 工具
 *
 * 纯粹的领域结构分析工具，支持递归分析多个领域：
 * - 限界上下文识别
 * - 聚合根解析
 * - 实体解析
 * - 值对象解析
 * - 领域事件解析
 * - 领域服务解析
 * - 领域状态解析
 * - 仓储接口解析
 */

import "reflect-metadata";
import { injectable } from "tsyringe";

import { analyzeDomainStructure, DomainAnalysisError } from "./core";
import {
  inputSchema,
  outputSchema,
  type InputType,
  type OutputType,
} from "./types";
import { Tool, BaseTool, ToolOptions, ToolContext, ToolResult } from "@/core";
import { createLogger } from "@/shared";

const log = createLogger("tool:domain-analyzer");

// ============================================================================
// MCP 工具定义
// ============================================================================


@injectable()
@Tool()
export class DomainAnalyzerTool extends BaseTool<
  typeof inputSchema,
  typeof outputSchema,
  InputType,
  OutputType
> {
  override getOptions(): ToolOptions<typeof inputSchema, typeof outputSchema> {
    return {
      name: "ddd_domain_analyzer",
      title: "Domain Structure Analyzer (领域结构分析器)",
      description:
        "Analyze DDD domain structure recursively. Supports analyzing from bounded context, " +
        "subdomain, or domain directory level. Uses TypeScript AST to precisely identify: " +
        "bounded contexts, aggregates, entities, value objects, domain events, domain services, " +
        "domain states, and repository interfaces. Returns structured analysis result with " +
        "element relationships. " +
        "(递归分析 DDD 领域结构。支持从限界上下文、子域或 domain 目录层级开始分析。" +
        "使用 TypeScript AST 精准识别：限界上下文、聚合根、实体、值对象、领域事件、" +
        "领域服务、领域状态、仓储接口。返回结构化分析结果及元素间关系。)",
      inputSchema,
      outputSchema,
    };
  }

  override async onInit(): Promise<void> {
    log.debug("Domain Analyzer Tool initializing...");
  }

  override async onReady(): Promise<void> {
    log.debug("Domain Analyzer Tool ready");
  }

  override async execute(
    input: InputType,
    _context: ToolContext
  ): Promise<ToolResult<OutputType>> {
    const { entryPath, options } = input;

    try {
      log.info(`开始分析领域结构: ${entryPath}`);

      // 调用核心分析器
      const result = await analyzeDomainStructure(entryPath, options);

      log.info(
        `分析完成: ${result.summary.stats.aggregates} 个聚合根, ` +
          `${result.summary.stats.entities} 个实体, ` +
          `${result.summary.stats.valueObjects} 个值对象`
      );

      return {
        success: true,
        data: result,
      };
    } catch (error) {
      // 处理已知错误类型
      if (error instanceof DomainAnalysisError) {
        log.warn(`分析失败 [${error.code}]: ${error.message}`);
        return {
          success: false,
          error: `[${error.code}] ${error.message}`,
        };
      }

      // 未知错误
      log.error("分析失败：", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  override async onDestroy(): Promise<void> {
    log.debug("Domain Analyzer Tool destroying...");
  }
}
