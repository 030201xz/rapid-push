/**
 * Handler 渲染器
 *
 * 负责生成 {name}.handler.ts 文件内容
 * 支持 Command Handler 和 Query Handler
 */

import type { IRDependency, IROperation } from "../core/ir";

// ============================================================================
// Handler 渲染器实现
// ============================================================================

export class HandlerRenderer {
  /**
   * 渲染 Handler 文件内容
   *
   * @param operation - IR 操作定义
   * @returns 完整的 TypeScript 文件内容
   */
  render(operation: IROperation): string {
    const { type } = operation;

    if (type === "mutation") {
      return this.renderCommandHandler(operation);
    }

    return this.renderQueryHandler(operation);
  }

  /**
   * 渲染 Command Handler
   */
  private renderCommandHandler(operation: IROperation): string {
    const { name, pascalName, description, handlerConfig } = operation;

    const commandClassName = `${pascalName}Command`;
    const handlerClassName = `${pascalName}Handler`;
    const outputTypeName = `${pascalName}Output`;

    // 构建描述注释
    const descriptionComment = description ?? `${pascalName} 命令处理器`;

    // 构建依赖相关代码
    const { dependencyImports, constructorParams, constructorBody } =
      this.buildDependencyCode(handlerConfig?.dependencies ?? []);

    // 构建额外 imports
    const extraImports = handlerConfig?.imports?.join("\n") ?? "";

    return `/**
 * ${descriptionComment}
 */

import { injectable } from 'tsyringe';

import { CommandHandler, type ICommandHandler } from '@/lib/cqrs';
${dependencyImports}${extraImports ? "\n" + extraImports : ""}

import type { ${outputTypeName} } from './output.schema';
import { ${commandClassName} } from './${name}.command';

/**
 * ${descriptionComment}
 */
@CommandHandler(${commandClassName})
@injectable()
export class ${handlerClassName} implements ICommandHandler<${commandClassName}> {
  constructor(${constructorParams}) {${constructorBody}}

  async execute(command: ${commandClassName}): Promise<${outputTypeName}> {
    const { data } = command;

    // TODO: 实现业务逻辑
    throw new Error('Not implemented');
  }
}
`;
  }

  /**
   * 渲染 Query Handler
   */
  private renderQueryHandler(operation: IROperation): string {
    const { name, pascalName, description, handlerConfig } = operation;

    const queryClassName = `${pascalName}Query`;
    const handlerClassName = `${pascalName}Handler`;
    const outputTypeName = `${pascalName}Output`;

    // 构建描述注释
    const descriptionComment = description ?? `${pascalName} 查询处理器`;

    // 构建依赖相关代码
    const { dependencyImports, constructorParams, constructorBody } =
      this.buildDependencyCode(handlerConfig?.dependencies ?? []);

    // 构建额外 imports
    const extraImports = handlerConfig?.imports?.join("\n") ?? "";

    return `/**
 * ${descriptionComment}
 */

import { injectable } from 'tsyringe';

import { QueryHandler, type IQueryHandler } from '@/lib/cqrs';
${dependencyImports}${extraImports ? "\n" + extraImports : ""}

import type { ${outputTypeName} } from './output.schema';
import { ${queryClassName} } from './${name}.query';

/**
 * ${descriptionComment}
 */
@QueryHandler(${queryClassName})
@injectable()
export class ${handlerClassName} implements IQueryHandler<${queryClassName}, ${outputTypeName}> {
  constructor(${constructorParams}) {${constructorBody}}

  async execute(query: ${queryClassName}): Promise<${outputTypeName}> {
    const { data } = query;

    // TODO: 实现业务逻辑
    throw new Error('Not implemented');
  }
}
`;
  }

  /**
   * 构建依赖注入相关代码
   */
  private buildDependencyCode(dependencies: IRDependency[]): {
    dependencyImports: string;
    constructorParams: string;
    constructorBody: string;
  } {
    if (dependencies.length === 0) {
      return {
        dependencyImports: "",
        constructorParams: "",
        constructorBody: "",
      };
    }

    // 按导入路径分组
    const importsByPath = new Map<string, string[]>();
    for (const dep of dependencies) {
      const existing = importsByPath.get(dep.importPath) ?? [];
      if (!existing.includes(dep.type)) {
        existing.push(dep.type);
      }
      importsByPath.set(dep.importPath, existing);
    }

    // 构建 import 语句
    const importLines: string[] = [];
    for (const [path, types] of importsByPath) {
      importLines.push(`import { ${types.join(", ")} } from '${path}';`);
    }
    const dependencyImports =
      importLines.length > 0 ? "\n" + importLines.join("\n") : "";

    // 构建构造函数参数
    const constructorParams = dependencies
      .map((dep) => `private readonly ${dep.name}: ${dep.type}`)
      .join(", ");

    return {
      dependencyImports,
      constructorParams,
      constructorBody: "",
    };
  }
}
