/**
 * Query 渲染器
 *
 * 负责生成 {name}.query.ts 文件内容
 * 用于 Query 操作的 CQRS Query 类
 */

import type { IROperation } from "../core/ir";

// ============================================================================
// Query 渲染器实现
// ============================================================================

export class QueryRenderer {
  /**
   * 渲染 Query 文件内容
   *
   * @param operation - IR 操作定义
   * @returns 完整的 TypeScript 文件内容
   */
  render(operation: IROperation): string {
    const { pascalName, description } = operation;

    // 类名
    const queryClassName = `${pascalName}Query`;
    const inputTypeName = `${pascalName}Input`;
    const outputTypeName = `${pascalName}Output`;

    // 构建描述注释
    const descriptionComment = description ?? `${pascalName} 查询`;

    return `/**
 * ${descriptionComment}
 */

import { Query } from '@/lib/cqrs';

import type { ${inputTypeName} } from './input.schema';
import type { ${outputTypeName} } from './output.schema';

/**
 * ${descriptionComment}
 */
export class ${queryClassName} extends Query<${outputTypeName}> {
  constructor(public readonly data: ${inputTypeName}) {
    super();
  }
}
`;
  }
}
