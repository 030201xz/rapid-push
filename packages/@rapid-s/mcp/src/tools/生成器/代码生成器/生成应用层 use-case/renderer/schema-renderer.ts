/**
 * Schema 渲染器
 *
 * 负责将 IR 中的 Schema 定义渲染为 TypeScript 代码
 * 生成 input.schema.ts 和 output.schema.ts 文件内容
 */

import {
  isObjectSchema,
  isReferenceSchema,
  type IRField,
  type IRObjectSchema,
  type IROperation,
  type IRReferenceSchema,
} from "../core/ir";

// ============================================================================
// 类型定义
// ============================================================================

type SchemaType = "input" | "output";

// ============================================================================
// Schema 渲染器实现
// ============================================================================

export class SchemaRenderer {
  /**
   * 渲染 Schema 文件内容
   *
   * @param operation - IR 操作定义
   * @param schemaType - 'input' 或 'output'
   * @returns 完整的 TypeScript 文件内容
   */
  render(operation: IROperation, schemaType: SchemaType): string {
    const schema = schemaType === "input" ? operation.input : operation.output;
    const suffix = schemaType === "input" ? "Input" : "Output";

    // 生成命名
    const schemaName = `${operation.camelName}${suffix}Schema`;
    const typeName = `${operation.pascalName}${suffix}`;

    // 根据 Schema 类型选择渲染策略
    if (isReferenceSchema(schema)) {
      return this.renderReferenceSchema(
        schema,
        schemaName,
        typeName,
        operation.description
      );
    }

    if (isObjectSchema(schema)) {
      return this.renderObjectSchema(
        schema,
        schemaName,
        typeName,
        operation.description
      );
    }

    // 类型穷尽检查
    const _exhaustive: never = schema;
    throw new Error(`Unknown schema kind: ${_exhaustive}`);
  }

  /**
   * 渲染引用类型 Schema
   */
  private renderReferenceSchema(
    schema: IRReferenceSchema,
    schemaName: string,
    typeName: string,
    description?: string
  ): string {
    const { ref, imports } = schema;

    // 构建 imports 区块
    const importsBlock = imports.join("\n");

    // 构建 schema 表达式
    const schemaExpression = ref.transform
      ? `${ref.schemaName}${ref.transform}`
      : ref.schemaName;

    // 构建描述注释
    const descriptionBlock = description ? `/**\n * ${description}\n */\n` : "";

    return `${importsBlock}

${descriptionBlock}export const ${schemaName} = ${schemaExpression};

export type ${typeName} = z.infer<typeof ${schemaName}>;
`;
  }

  /**
   * 渲染对象类型 Schema
   */
  private renderObjectSchema(
    schema: IRObjectSchema,
    schemaName: string,
    typeName: string,
    description?: string
  ): string {
    const { fields, imports } = schema;

    // 构建 imports 区块
    const importsBlock = imports.join("\n");

    // 构建 schema body
    const schemaBody = this.renderSchemaBody(fields);

    // 构建描述注释
    const descriptionBlock = description ? `/**\n * ${description}\n */\n` : "";

    return `${importsBlock}

${descriptionBlock}export const ${schemaName} = ${schemaBody};

export type ${typeName} = z.infer<typeof ${schemaName}>;
`;
  }

  /**
   * 渲染 z.object({...}) 内容
   */
  private renderSchemaBody(fields: IRField[]): string {
    if (fields.length === 0) {
      return "z.object({})";
    }

    const fieldLines = fields.map((field) => this.renderField(field));

    // 用空行分隔每个字段块（包含注释的字段）
    return `z.object({
${fieldLines.join("\n")}
})`;
  }

  /**
   * 渲染单个字段
   *
   * 使用顶部 JSDoc 注释格式：
   * ```
   * /** 字段说明 *\/
   * fieldName: z.string(),
   * ```
   */
  private renderField(field: IRField): string {
    const { name, zodExpression, comment } = field;

    if (comment) {
      // 有注释时使用顶部 JSDoc 格式
      return `  /** ${comment} */\n  ${name}: ${zodExpression},`;
    }

    // 无注释时直接输出字段
    return `  ${name}: ${zodExpression},`;
  }
}
