/**
 * Index 渲染器
 *
 * 负责生成 index.ts 文件内容：
 * - 操作级别的 index.ts（导出 schema、command/query、handler）
 * - 模块级别的 index.ts（聚合多个操作的导出）
 */

import type {
  IRGenerationPlan,
  IROperation,
  IROperationType,
} from "../core/ir";

// ============================================================================
// Index 渲染器实现
// ============================================================================

export class IndexRenderer {
  /**
   * 渲染操作级别的 index.ts
   * 导出该操作的所有模块
   *
   * @param operation - IR 操作定义
   * @returns index.ts 文件内容
   */
  renderOperationIndex(operation: IROperation): string {
    const { name, camelName, pascalName, type, generateHandler } = operation;

    const inputSchemaName = `${camelName}InputSchema`;
    const inputTypeName = `${pascalName}Input`;
    const outputSchemaName = `${camelName}OutputSchema`;
    const outputTypeName = `${pascalName}Output`;

    const lines: string[] = [
      // Schema 导出
      `export { ${inputSchemaName}, type ${inputTypeName} } from './input.schema';`,
      `export { ${outputSchemaName}, type ${outputTypeName} } from './output.schema';`,
    ];

    // Handler 相关导出
    if (generateHandler) {
      if (type === "mutation") {
        const commandClassName = `${pascalName}Command`;
        lines.push(`export { ${commandClassName} } from './${name}.command';`);
      } else {
        const queryClassName = `${pascalName}Query`;
        lines.push(`export { ${queryClassName} } from './${name}.query';`);
      }

      const handlerClassName = `${pascalName}Handler`;
      lines.push(`export { ${handlerClassName} } from './${name}.handler';`);
    }

    return lines.join("\n") + "\n";
  }

  /**
   * 渲染模块级别的 index.ts
   * 聚合该类型（mutations 或 queries）下所有操作的导出
   *
   * @param operationType - 操作类型
   * @param plan - 完整的生成计划
   * @returns index.ts 文件内容
   */
  renderModuleIndex(
    operationType: IROperationType,
    plan: IRGenerationPlan
  ): string {
    const operations =
      operationType === "mutation" ? plan.mutations : plan.queries;
    const typeLabel = operationType === "mutation" ? "Mutations" : "Queries";

    // 生成所有操作的导出语句
    const exports = operations
      .map((op) => `export * from './${op.name}';`)
      .join("\n");

    return `/**
 * ${typeLabel} Use-Cases
 */

${exports}
`;
  }
}
