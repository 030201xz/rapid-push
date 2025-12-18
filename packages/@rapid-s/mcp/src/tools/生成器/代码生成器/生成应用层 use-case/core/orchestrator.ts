/**
 * Use-Case 生成编排器
 *
 * 协调整个生成流程：Parser → Renderer → Writer
 * 职责：
 * - 调用 Parser 解析输入
 * - 调用 Renderer 生成代码（Schema、Command/Query、Handler）
 * - 调用 Writer 写入文件
 * - 构建输出结果
 */

import { createLogger } from "@/shared";
import { join } from "node:path";

import type { InputParser } from "../parser";
import type {
  CommandRenderer,
  HandlerRenderer,
  IndexRenderer,
  QueryRenderer,
  SchemaRenderer,
} from "../renderer";
import type { GeneratedFile, InputType, OutputType } from "../types";
import type { FileWriter } from "../writer";
import type {
  IRFileToWrite,
  IRFileType,
  IRGenerationPlan,
  IROperation,
  IRWriteResult,
} from "./ir";

const log = createLogger("tool:use-case-generator:orchestrator");

// ============================================================================
// 编排器实现
// ============================================================================

export class UseCaseGenerationOrchestrator {
  constructor(
    private readonly parser: InputParser,
    private readonly schemaRenderer: SchemaRenderer,
    private readonly indexRenderer: IndexRenderer,
    private readonly commandRenderer: CommandRenderer,
    private readonly queryRenderer: QueryRenderer,
    private readonly handlerRenderer: HandlerRenderer,
    private readonly writer: FileWriter,
    private readonly fileSuffix: string = ""
  ) {}

  /**
   * 执行完整的 Use-Case 生成流程
   */
  async execute(input: InputType): Promise<OutputType> {
    log.info(`开始生成 Use-Case，目标路径：${input.basePath}`);
    log.info(`操作数量：${input.operations.length}`);

    // 1. 解析输入为 IR
    const plan = this.parser.parse(input);
    log.debug(
      `解析完成：${plan.mutations.length} mutations, ${plan.queries.length} queries`
    );

    // 2. 生成所有文件内容
    const filesToWrite = this.generateAllFiles(plan);
    log.debug(`生成文件内容：${filesToWrite.length} 个文件`);

    // 3. 写入文件
    const writeResults = await this.writer.writeAll(filesToWrite);

    // 4. 构建输出
    return this.buildOutput(writeResults, plan);
  }

  /**
   * 生成所有需要写入的文件
   */
  private generateAllFiles(plan: IRGenerationPlan): IRFileToWrite[] {
    const files: IRFileToWrite[] = [];

    // 生成 mutations
    for (const op of plan.mutations) {
      files.push(
        ...this.generateOperationFiles(plan.basePath, "mutations", op)
      );
    }

    // 生成 queries
    for (const op of plan.queries) {
      files.push(...this.generateOperationFiles(plan.basePath, "queries", op));
    }

    // 生成模块级 index.ts
    if (plan.mutations.length > 0) {
      files.push({
        path: this.appendSuffix(join(plan.basePath, "mutations", "index.ts")),
        content: this.indexRenderer.renderModuleIndex("mutation", plan),
        type: "index",
      });
    }

    if (plan.queries.length > 0) {
      files.push({
        path: this.appendSuffix(join(plan.basePath, "queries", "index.ts")),
        content: this.indexRenderer.renderModuleIndex("query", plan),
        type: "index",
      });
    }

    return files;
  }

  /**
   * 生成单个操作的所有文件
   */
  private generateOperationFiles(
    basePath: string,
    typeDir: "mutations" | "queries",
    operation: IROperation
  ): IRFileToWrite[] {
    const opDir = join(basePath, typeDir, operation.name);
    const files: IRFileToWrite[] = [];

    // Schema 文件（始终生成）
    files.push(
      {
        path: this.appendSuffix(join(opDir, "input.schema.ts")),
        content: this.schemaRenderer.render(operation, "input"),
        type: "input-schema",
      },
      {
        path: this.appendSuffix(join(opDir, "output.schema.ts")),
        content: this.schemaRenderer.render(operation, "output"),
        type: "output-schema",
      }
    );

    // Handler 相关文件（可选）
    if (operation.generateHandler) {
      if (operation.type === "mutation") {
        // Command 文件
        files.push({
          path: this.appendSuffix(join(opDir, `${operation.name}.command.ts`)),
          content: this.commandRenderer.render(operation),
          type: "command",
        });
      } else {
        // Query 文件
        files.push({
          path: this.appendSuffix(join(opDir, `${operation.name}.query.ts`)),
          content: this.queryRenderer.render(operation),
          type: "query",
        });
      }

      // Handler 文件
      files.push({
        path: this.appendSuffix(join(opDir, `${operation.name}.handler.ts`)),
        content: this.handlerRenderer.render(operation),
        type: "handler",
      });
    }

    // Index 文件
    files.push({
      path: this.appendSuffix(join(opDir, "index.ts")),
      content: this.indexRenderer.renderOperationIndex(operation),
      type: "index",
    });

    return files;
  }

  /**
   * 构建最终输出
   */
  private buildOutput(
    results: IRWriteResult[],
    plan: IRGenerationPlan
  ): OutputType {
    // 分离成功和失败
    const successResults = results.filter((r) => r.success);
    const failedResults = results.filter((r) => !r.success);

    // 转换为 GeneratedFile 格式
    const generated: GeneratedFile[] = successResults.map((r) => ({
      path: r.path,
      type: r.type,
    }));

    // 构建摘要
    const summary = this.buildSummary(generated, failedResults, plan);

    return { generated, summary };
  }

  /**
   * 构建 Markdown 格式的摘要
   */
  private buildSummary(
    generated: GeneratedFile[],
    errors: IRWriteResult[],
    plan: IRGenerationPlan
  ): string {
    const lines: string[] = ["# Use-Case 生成完成", ""];

    // 统计信息
    lines.push("## 📊 统计");
    lines.push(`- Mutations: ${plan.mutations.length} 个操作`);
    lines.push(`- Queries: ${plan.queries.length} 个操作`);
    lines.push(`- 生成文件: ${generated.length} 个`);
    lines.push("");

    // 生成的文件列表
    if (generated.length > 0) {
      lines.push("## 📁 生成的文件");

      for (const file of generated) {
        const icon = this.getFileTypeIcon(file.type);
        lines.push(`- ${icon} \`${file.path}\``);
      }

      lines.push("");
    }

    // 错误信息
    if (errors.length > 0) {
      lines.push("## ⚠️ 错误");

      for (const err of errors) {
        lines.push(`- ❌ \`${err.path}\`: ${err.error}`);
      }

      lines.push("");
    }

    return lines.join("\n");
  }

  /**
   * 获取文件类型对应的图标
   */
  private getFileTypeIcon(type: IRFileType): string {
    const iconMap: Record<IRFileType, string> = {
      "input-schema": "📥",
      "output-schema": "📤",
      command: "⚡",
      query: "🔍",
      handler: "🎯",
      index: "📦",
    };

    return iconMap[type];
  }

  /**
   * 在文件路径末尾添加后缀
   * 将后缀追加到文件名最后
   * 示例：input.schema.ts -> input.schema.ts.keep
   */
  private appendSuffix(filePath: string): string {
    if (!this.fileSuffix) {
      return filePath;
    }

    return `${filePath}${this.fileSuffix}`;
  }
}
