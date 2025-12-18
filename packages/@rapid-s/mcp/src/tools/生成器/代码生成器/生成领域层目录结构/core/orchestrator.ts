/**
 * Domain Scaffold Generator - 编排器
 *
 * 协调整个生成流程：Parser → Renderer → Writer
 */

import { createLogger } from "@/shared";


import type { IRGenerationPlan, IRWriteResult } from "./ir";
import type { InputParser } from "../parser";
import type { PlaceholderRenderer } from "../renderer";
import type { FileWriter, FileToWrite } from "../writer";
import type { InputType, OutputType, AggregateFiles } from "../types";

const log = createLogger("tool:domain-scaffold:orchestrator");

/**
 * 领域脚手架编排器
 *
 * 职责：
 * - 调用 Parser 解析输入
 * - 调用 Renderer 生成占位内容
 * - 调用 Writer 写入文件
 * - 构建输出结果
 */
export class DomainScaffoldOrchestrator {
  constructor(
    private readonly parser: InputParser,
    private readonly renderer: PlaceholderRenderer,
    private readonly writer: FileWriter
  ) {}

  /**
   * 执行完整的脚手架生成流程
   */
  async execute(input: InputType): Promise<OutputType> {
    log.info(`开始生成领域层脚手架，目标路径：${input.outputPath}`);

    // 1. 解析输入为 IR
    const plan = this.parser.parse(input);
    log.debug(
      `解析完成：${plan.subdomains.length} 子域，${plan.allFiles.length} 文件`
    );

    // 2. 生成所有文件内容
    const filesToWrite = this.generateAllFiles(plan);
    log.debug(`生成文件内容：${filesToWrite.length} 个文件`);

    // 3. 写入文件
    this.writer.reset();
    const writeResults = await this.writer.writeAll(filesToWrite, {
      overwrite: plan.options.overwrite,
    });

    // 4. 构建输出
    return this.buildOutput(writeResults, plan);
  }

  /**
   * 生成所有待写入的文件
   */
  private generateAllFiles(plan: IRGenerationPlan): FileToWrite[] {
    const { placeholderSuffix } = plan.options;

    return plan.allFiles.map((file) => ({
      path: `${file.path}${placeholderSuffix}`,
      content: this.renderer.render(file),
      type: file.type,
    }));
  }

  /**
   * 构建输出结果
   */
  private buildOutput(
    results: IRWriteResult[],
    plan: IRGenerationPlan
  ): OutputType {
    // 统计信息
    const totalFiles = results.length;
    const createdFiles = results.filter((r) => r.created).length;
    const skippedFiles = results.filter((r) => r.success && !r.created).length;
    const totalDirs = this.writer.getCreatedDirsCount();

    // 计算聚合和子域数量
    let aggregatesCount = 0;
    for (const subdomain of plan.subdomains) {
      for (const layer of subdomain.layers) {
        aggregatesCount += layer.aggregates.length;
      }
    }

    // 按聚合分组文件
    const generatedFiles = this.groupFilesByAggregate(results, plan);

    // 生成目录树预览
    const directoryTree = this.generateDirectoryTree(plan);

    log.info(
      `生成完成：${createdFiles} 文件创建，${skippedFiles} 文件跳过，${totalDirs} 目录`
    );

    return {
      stats: {
        totalFiles,
        totalDirs,
        aggregatesCount,
        subdomainsCount: plan.subdomains.length,
        skippedFiles,
      },
      generatedFiles,
      directoryTree,
    };
  }

  /**
   * 按聚合分组文件
   */
  private groupFilesByAggregate(
    results: IRWriteResult[],
    plan: IRGenerationPlan
  ): AggregateFiles[] {
    const groups: AggregateFiles[] = [];

    for (const subdomain of plan.subdomains) {
      for (const layer of subdomain.layers) {
        // 聚合内的文件
        for (const aggregate of layer.aggregates) {
          const aggregateResults = results.filter((r) =>
            r.path.includes(`/${aggregate.name}/`)
          );

          if (aggregateResults.length > 0) {
            groups.push({
              aggregate: aggregate.name,
              subdomain: subdomain.name,
              layer: layer.name,
              files: aggregateResults.map((r) => ({
                path: r.path,
                type: r.type,
                created: r.created,
              })),
            });
          }
        }

        // 服务文件
        if (layer.services.length > 0) {
          const serviceResults = results.filter((r) =>
            r.path.includes("/services/")
          );
          if (serviceResults.length > 0) {
            groups.push({
              aggregate: "_services",
              subdomain: subdomain.name,
              layer: layer.name,
              files: serviceResults.map((r) => ({
                path: r.path,
                type: r.type,
                created: r.created,
              })),
            });
          }
        }

        // 异常文件
        if (layer.exceptions.length > 0) {
          const exceptionResults = results.filter((r) =>
            r.path.includes("/exceptions/")
          );
          if (exceptionResults.length > 0) {
            groups.push({
              aggregate: "_exceptions",
              subdomain: subdomain.name,
              layer: layer.name,
              files: exceptionResults.map((r) => ({
                path: r.path,
                type: r.type,
                created: r.created,
              })),
            });
          }
        }
      }
    }

    return groups;
  }

  /**
   * 生成目录树预览
   */
  private generateDirectoryTree(plan: IRGenerationPlan): string {
    const lines: string[] = [];
    const indent = "  ";

    lines.push(`${plan.contextName}/`);

    for (const subdomain of plan.subdomains) {
      lines.push(`${indent}${subdomain.name}/`);

      for (const layer of subdomain.layers) {
        lines.push(`${indent}${indent}${layer.name}/`);

        // 聚合
        for (const aggregate of layer.aggregates) {
          lines.push(`${indent}${indent}${indent}${aggregate.name}/`);

          // 简化显示：只显示文件数量
          const entityCount = aggregate.files.filter(
            (f) => f.type === "entity"
          ).length;
          const voCount = aggregate.files.filter(
            (f) => f.type === "value-object"
          ).length;
          const stateCount = aggregate.files.filter(
            (f) => f.type === "state"
          ).length;
          const eventCount = aggregate.files.filter(
            (f) => f.type === "event"
          ).length;

          if (entityCount > 0) {
            lines.push(
              `${indent}${indent}${indent}${indent}entities/ (${entityCount} files)`
            );
          }
          if (voCount > 0) {
            lines.push(
              `${indent}${indent}${indent}${indent}value-objects/ (${voCount} files)`
            );
          }
          if (stateCount > 0) {
            lines.push(
              `${indent}${indent}${indent}${indent}states/ (${stateCount} files)`
            );
          }
          if (eventCount > 0) {
            lines.push(
              `${indent}${indent}${indent}${indent}events/ (${eventCount} files)`
            );
          }
        }

        // 服务
        if (layer.services.length > 0) {
          lines.push(
            `${indent}${indent}${indent}services/ (${layer.services.length} files)`
          );
        }

        // 异常
        if (layer.exceptions.length > 0) {
          lines.push(
            `${indent}${indent}${indent}exceptions/ (${layer.exceptions.length} files)`
          );
        }
      }
    }

    return lines.join("\n");
  }
}
