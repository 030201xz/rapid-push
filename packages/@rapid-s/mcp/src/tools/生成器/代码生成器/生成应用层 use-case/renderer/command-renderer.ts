/**
 * Command 渲染器
 *
 * 负责生成 {name}.command.ts 文件内容
 * 用于 Mutation 操作的 CQRS Command 类
 */

import type { IROperation } from "../core/ir";

// ============================================================================
// Command 渲染器实现
// ============================================================================

export class CommandRenderer {
  /**
   * 渲染 Command 文件内容
   *
   * @param operation - IR 操作定义
   * @returns 完整的 TypeScript 文件内容
   */
  render(operation: IROperation): string {
    const { pascalName, description } = operation;

    // 类名
    const commandClassName = `${pascalName}Command`;
    const inputTypeName = `${pascalName}Input`;
    const outputTypeName = `${pascalName}Output`;

    // 构建描述注释
    const descriptionComment = description ?? `${pascalName} 命令`;

    return `/**
 * ${descriptionComment}
 */

import { Command } from '@/lib/cqrs';

import type { ${inputTypeName} } from './input.schema';
import type { ${outputTypeName} } from './output.schema';

/**
 * ${descriptionComment}
 */
export class ${commandClassName} extends Command<${outputTypeName}> {
  constructor(public readonly data: ${inputTypeName}) {
    super();
  }
}
`;
  }
}
