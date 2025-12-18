/**
 * 输入解析器
 *
 * 将工具原始输入转换为中间表示层 (IR)
 * 负责：
 * - 类型判断（字段数组 vs Schema 引用）
 * - Zod v3 → v4 API 迁移
 * - 命名变体预计算
 * - Import 语句收集与去重
 * - Handler 配置解析
 */

import type {
  IRDependency,
  IRField,
  IRGenerationPlan,
  IRHandlerConfig,
  IRObjectSchema,
  IROperation,
  IRReferenceSchema,
  IRSchemaDefinition,
  IRSchemaRef,
} from "../core/ir";
import type {
  Dependency,
  FieldDefinition,
  HandlerConfig,
  InputType,
  Operation,
  RefDefinition,
} from "../types";
import {
  inferModulePath,
  kebabToCamel,
  kebabToPascal,
  migrateZodV3ToV4,
} from "../utils";

// ============================================================================
// 类型守卫
// ============================================================================

/**
 * 判断是否为 Schema 引用定义
 */
function isRefDefinition(
  input: FieldDefinition[] | RefDefinition
): input is RefDefinition {
  return !Array.isArray(input) && "ref" in input && "from" in input;
}

// ============================================================================
// 解析器实现
// ============================================================================

export class InputParser {
  /**
   * 解析完整输入为生成计划
   */
  parse(input: InputType): IRGenerationPlan {
    const { basePath, modulePath, operations } = input;

    // 推断或使用提供的 modulePath
    const resolvedModulePath = modulePath ?? inferModulePath(basePath);

    // 按类型分组并解析操作
    const mutations: IROperation[] = [];
    const queries: IROperation[] = [];

    for (const op of operations) {
      const irOperation = this.parseOperation(op);

      if (irOperation.type === "mutation") {
        mutations.push(irOperation);
      } else {
        queries.push(irOperation);
      }
    }

    return {
      basePath,
      modulePath: resolvedModulePath,
      mutations,
      queries,
    };
  }

  /**
   * 解析单个操作
   */
  private parseOperation(op: Operation): IROperation {
    // 默认生成 Handler
    const generateHandler = op.generateHandler !== false;

    return {
      name: op.name,
      camelName: kebabToCamel(op.name),
      pascalName: kebabToPascal(op.name),
      type: op.type,
      description: op.description,
      input: this.parseSchemaDefinition(op.input, op.imports),
      output: this.parseSchemaDefinition(op.output, op.imports),
      generateHandler,
      handlerConfig: generateHandler
        ? this.parseHandlerConfig(op.handler)
        : undefined,
    };
  }

  /**
   * 解析 Handler 配置
   */
  private parseHandlerConfig(config?: HandlerConfig): IRHandlerConfig {
    const dependencies: IRDependency[] = (config?.dependencies ?? []).map(
      (dep: Dependency) => ({
        name: dep.name,
        type: dep.type,
        importPath: dep.importPath,
      })
    );

    const imports = config?.imports ?? [];

    return {
      dependencies,
      imports,
    };
  }

  /**
   * 解析 Schema 定义（字段数组或引用）
   */
  private parseSchemaDefinition(
    definition: FieldDefinition[] | RefDefinition,
    customImports?: string[]
  ): IRSchemaDefinition {
    if (isRefDefinition(definition)) {
      return this.parseReferenceSchema(definition, customImports);
    }

    return this.parseObjectSchema(definition, customImports);
  }

  /**
   * 解析引用类型 Schema
   */
  private parseReferenceSchema(
    ref: RefDefinition,
    customImports?: string[]
  ): IRReferenceSchema {
    const irRef: IRSchemaRef = {
      schemaName: ref.ref,
      importPath: ref.from,
      transform: ref.transform,
    };

    // 收集 imports
    const imports = this.collectImports([], [irRef], customImports);

    return {
      kind: "reference",
      ref: irRef,
      imports,
    };
  }

  /**
   * 解析对象类型 Schema
   */
  private parseObjectSchema(
    fields: FieldDefinition[],
    customImports?: string[]
  ): IRObjectSchema {
    // 解析字段，同时收集嵌入的引用
    const irFields: IRField[] = [];
    const embeddedRefs: IRSchemaRef[] = [];

    for (const field of fields) {
      const irField = this.parseField(field);
      irFields.push(irField);

      // 注意：当前设计中，字段数组里的每个元素都是 FieldDefinition
      // 如果需要支持字段内嵌引用，需要扩展此逻辑
    }

    // 收集 imports
    const imports = this.collectImports(irFields, embeddedRefs, customImports);

    return {
      kind: "object",
      fields: irFields,
      imports,
    };
  }

  /**
   * 解析单个字段
   */
  private parseField(field: FieldDefinition): IRField {
    return {
      name: field.name,
      // 自动迁移 Zod v3 API 到 v4
      zodExpression: migrateZodV3ToV4(field.zodType),
      comment: field.comment,
    };
  }

  /**
   * 收集并去重 import 语句
   */
  private collectImports(
    _fields: IRField[],
    refs: IRSchemaRef[],
    customImports?: string[]
  ): string[] {
    const imports: string[] = [];

    // 基础 zod import
    imports.push("import { z } from 'zod';");

    // 引用的 Schema imports（按路径分组）
    if (refs.length > 0) {
      const groupedByPath = new Map<string, string[]>();

      for (const ref of refs) {
        const existing = groupedByPath.get(ref.importPath) ?? [];
        existing.push(ref.schemaName);
        groupedByPath.set(ref.importPath, existing);
      }

      for (const [path, schemaNames] of groupedByPath) {
        const uniqueNames = [...new Set(schemaNames)];
        imports.push(`import { ${uniqueNames.join(", ")} } from '${path}';`);
      }
    }

    // 自定义 imports
    if (customImports) {
      imports.push(...customImports);
    }

    // 去重
    return [...new Set(imports)];
  }
}
