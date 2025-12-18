/**
 * Domain Scaffold Generator - 占位文件渲染器
 *
 * 根据文件类型生成对应的占位内容
 */

import type { IRFileToWrite } from "../core/ir";
import { extractClassName, kebabToPascal } from "../utils";

/**
 * 占位文件渲染器
 * 根据文件类型生成带有 JSDoc 和骨架代码的占位内容
 */
export class PlaceholderRenderer {
  /**
   * 渲染占位文件内容
   */
  render(file: IRFileToWrite): string {
    switch (file.type) {
      case "aggregate":
        return this.renderAggregate(file);
      case "entity":
        return this.renderEntity(file);
      case "value-object":
        return this.renderValueObject(file);
      case "state":
        return this.renderState(file);
      case "event":
        return this.renderEvent(file);
      case "repository":
        return this.renderRepository(file);
      case "service":
        return this.renderService(file);
      case "exception":
        return this.renderException(file);
      case "index":
        return this.renderIndex(file);
      default:
        return this.renderGeneric(file);
    }
  }

  /**
   * 渲染聚合根占位
   */
  private renderAggregate(file: IRFileToWrite): string {
    const className = file.className ?? extractClassName(file.filename);
    const description = file.description ?? `${className} 聚合根`;

    return `/**
 * @file ${file.filename}
 * @description ${description}
 * @aggregate ${file.aggregate}
 * @subdomain ${file.subdomain}
 *
 * TODO: 实现聚合根逻辑
 */

/**
 * ${description}
 */
export class ${className} {
  // TODO: 实现聚合根属性和方法
}
`;
  }

  /**
   * 渲染实体占位
   */
  private renderEntity(file: IRFileToWrite): string {
    const className = file.className ?? extractClassName(file.filename);
    const description = file.description ?? `${className} 实体`;

    return `/**
 * @file ${file.filename}
 * @description ${description}
 * @aggregate ${file.aggregate}
 *
 * TODO: 实现实体逻辑
 */

/**
 * ${description}
 */
export class ${className} {
  // TODO: 实现实体属性和方法
}
`;
  }

  /**
   * 渲染值对象占位
   */
  private renderValueObject(file: IRFileToWrite): string {
    const className = file.className ?? extractClassName(file.filename);

    return `/**
 * @file ${file.filename}
 * @description ${className} 值对象
 * @aggregate ${file.aggregate}
 *
 * TODO: 实现值对象
 */

/**
 * ${className} 值对象
 *
 * 值对象特性：
 * - 不可变性
 * - 通过值比较相等性
 * - 无唯一标识
 */
export class ${className} {
  // TODO: 实现值对象

  private constructor() {
    // 私有构造函数，使用静态工厂方法创建
  }

  /**
   * 创建值对象实例
   */
  static create(): ${className} {
    // TODO: 实现创建逻辑
    throw new Error("Not implemented");
  }

  /**
   * 比较两个值对象是否相等
   */
  equals(other: ${className}): boolean {
    // TODO: 实现相等性比较
    throw new Error("Not implemented");
  }
}
`;
  }

  /**
   * 渲染状态占位
   */
  private renderState(file: IRFileToWrite): string {
    const filename = file.filename;

    // 检测是否是接口或工厂
    if (filename.includes(".interface.")) {
      return this.renderStateInterface(file);
    }
    if (filename.includes(".factory.")) {
      return this.renderStateFactory(file);
    }

    const className = file.className ?? extractClassName(file.filename);

    return `/**
 * @file ${file.filename}
 * @description ${className} 状态
 * @aggregate ${file.aggregate}
 *
 * TODO: 实现状态模式
 */

/**
 * ${className}
 *
 * 状态模式实现
 */
export class ${className} {
  // TODO: 实现状态逻辑
}
`;
  }

  /**
   * 渲染状态接口占位
   */
  private renderStateInterface(file: IRFileToWrite): string {
    const className = file.className ?? extractClassName(file.filename);

    return `/**
 * @file ${file.filename}
 * @description ${className} 状态接口
 * @aggregate ${file.aggregate}
 *
 * TODO: 定义状态接口
 */

/**
 * ${className}
 *
 * 状态模式接口定义
 */
export interface ${className} {
  // TODO: 定义状态方法
}
`;
  }

  /**
   * 渲染状态工厂占位
   */
  private renderStateFactory(file: IRFileToWrite): string {
    const className = file.className ?? extractClassName(file.filename);

    return `/**
 * @file ${file.filename}
 * @description ${className} 状态工厂
 * @aggregate ${file.aggregate}
 *
 * TODO: 实现状态工厂
 */

/**
 * ${className}
 *
 * 状态工厂，根据状态类型创建对应的状态实例
 */
export class ${className} {
  // TODO: 实现状态工厂逻辑
}
`;
  }

  /**
   * 渲染事件占位
   */
  private renderEvent(file: IRFileToWrite): string {
    const className = file.className ?? extractClassName(file.filename);
    const aggregateName = file.aggregate
      ? kebabToPascal(file.aggregate)
      : "Domain";

    return `/**
 * @file ${file.filename}
 * @description ${aggregateName} 领域事件
 * @aggregate ${file.aggregate}
 *
 * TODO: 定义领域事件
 */

/**
 * ${aggregateName} 领域事件定义
 */
export const ${className} = {
  // TODO: 定义领域事件
} as const;
`;
  }

  /**
   * 渲染仓储接口占位
   */
  private renderRepository(file: IRFileToWrite): string {
    const className = file.className ?? extractClassName(file.filename);
    const aggregateName = file.aggregate
      ? kebabToPascal(file.aggregate)
      : "Entity";
    const tokenName = `${className}Token`;

    return `/**
 * @file ${file.filename}
 * @description ${className} 仓储接口
 * @aggregate ${file.aggregate}
 *
 * ⚠️  重要：仓储接口实现 DI 注入的完整步骤
 *
 * 1️⃣  【领域层】定义接口和 Token（当前文件）
 *    - 导出接口 ${className}
 *    - 导出 Token ${tokenName}
 *
 * 2️⃣  【基础设施层】实现接口
 *    文件: infrastructure/repository/${file.aggregate}.repository.ts
 *    \`\`\`typescript
 *    @injectable()
 *    export class ${aggregateName}Repository implements ${className} {
 *      // 实现接口方法...
 *    }
 *    \`\`\`
 *
 * 3️⃣  【模块层】绑定 Token 到实现
 *    文件: ${file.aggregate}-management.module.ts
 *    \`\`\`typescript
 *    import { container } from 'tsyringe';
 *    import { ${tokenName} } from './domain/${file.aggregate}/${file.filename}';
 *    import { ${aggregateName}Repository } from './infrastructure';
 *
 *    @Module({
 *      imports: [CqrsModule.forFeature({ handlers: [...] })],
 *      providers: [${aggregateName}Repository],
 *    })
 *    export class ${aggregateName}ManagementModule {
 *      static {
 *        container.register(${tokenName}, { useClass: ${aggregateName}Repository });
 *      }
 *    }
 *    \`\`\`
 *
 * 4️⃣  【应用层】在 Handler 中注入
 *    文件: application/use-cases/.../xxx.handler.ts
 *    \`\`\`typescript
 *    import { inject, injectable } from 'tsyringe';
 *    import { ${tokenName}, type ${className} } from '../../domain';
 *
 *    @CommandHandler(XxxCommand)
 *    @injectable()
 *    export class XxxHandler {
 *      constructor(
 *        @inject(${tokenName}) private readonly repo: ${className},
 *      ) {}
 *    }
 *    \`\`\`
 *
 * TODO: 定义仓储接口方法
 */

import type { ${aggregateName}Aggregate } from './${file.aggregate}.aggregate';

/**
 * ${className} 的 DI Token
 *
 * 用于 tsyringe 依赖注入，解决接口无法直接注入的问题
 */
export const ${tokenName} = Symbol('${className}');

/**
 * ${className}
 *
 * ${aggregateName} 聚合的仓储接口定义
 */
export interface ${className} {
  /**
   * 根据 ID 查找实体
   */
  findById(id: string): Promise<${aggregateName}Aggregate | null>;

  /**
   * 保存实体（新增或更新）
   */
  save(entity: ${aggregateName}Aggregate): Promise<void>;

  /**
   * 删除实体
   */
  delete(id: string): Promise<void>;

  // TODO: 添加其他仓储方法
  // - 根据唯一标识查找: findByXxx
  // - 检查是否存在: exists, existsByXxx
  // - 批量操作: findMany, saveMany
}
`;
  }

  /**
   * 渲染领域服务占位
   */
  private renderService(file: IRFileToWrite): string {
    const className = file.className ?? extractClassName(file.filename);
    const description = file.description ?? `${className} 领域服务`;

    return `/**
 * @file ${file.filename}
 * @description ${description}
 * @subdomain ${file.subdomain}
 *
 * TODO: 实现领域服务
 */

/**
 * ${description}
 *
 * 领域服务用于处理跨聚合的业务逻辑
 */
export class ${className} {
  // TODO: 实现领域服务方法
}
`;
  }

  /**
   * 渲染异常占位
   */
  private renderException(file: IRFileToWrite): string {
    const className = file.className ?? extractClassName(file.filename);

    return `/**
 * @file ${file.filename}
 * @description ${className} 领域异常
 * @subdomain ${file.subdomain}
 *
 * TODO: 定义领域异常
 */

/**
 * ${className}
 *
 * 领域异常定义
 */
export const ${className} = {
  // TODO: 定义领域异常
} as const;
`;
  }

  /**
   * 渲染 index 占位
   */
  private renderIndex(file: IRFileToWrite): string {
    return `/**
 * @file ${file.filename}
 * @description 模块导出索引
 * @aggregate ${file.aggregate ?? "N/A"}
 * @subdomain ${file.subdomain}
 *
 * TODO: 添加模块导出
 */

// TODO: 导出模块内容
// export * from "./xxx";
`;
  }

  /**
   * 渲染通用占位
   */
  private renderGeneric(file: IRFileToWrite): string {
    return `/**
 * @file ${file.filename}
 * @description TODO: 添加描述
 * @subdomain ${file.subdomain}
 *
 * TODO: 实现功能
 */

// TODO: 实现代码
`;
  }
}
