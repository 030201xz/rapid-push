/**
 * Use-Case Generator - 输入 Schema 定义
 *
 * 定义工具接收的输入参数结构
 * 支持生成：DTO Schema + Command/Query + Handler
 */
import { z } from "zod";

// ============================================================================
// 基础定义
// ============================================================================

/**
 * 字段定义 Schema
 * 用于定义 DTO 中的单个字段
 */
export const fieldDefinitionSchema = z.object({
  /** 字段名 */
  name: z.string().describe("Field name (字段名)"),
  /** Zod 类型表达式，如 "z.string()"、"userIdSchema" */
  zodType: z
    .string()
    .describe(
      'Zod type expression, e.g. "z.string()", "usernameSchema" (Zod 类型表达式)'
    ),
  /** 字段注释 */
  comment: z.string().optional().describe("Field comment (字段注释)"),
});

/**
 * Schema 引用定义
 * 用于引用已存在的 Schema，避免重复定义
 */
export const refDefinitionSchema = z.object({
  /** 引用的 Schema 名称 */
  ref: z
    .string()
    .describe(
      'Referenced schema name, e.g. "existsResponseSchema" (引用的 Schema 名称)'
    ),
  /** 导入来源路径 */
  from: z.string().describe('Import path, e.g. "../../../_shared" (导入路径)'),
  /** 可选的链式转换，如 ".nullable()"、".array()" */
  transform: z
    .string()
    .optional()
    .describe('Optional transform like ".nullable()" or ".array()" (可选转换)'),
});

/**
 * 依赖注入定义
 * 用于 Handler 的构造函数依赖
 */
export const dependencySchema = z.object({
  /** 参数名（camelCase），如 userRepo */
  name: z
    .string()
    .describe('Parameter name in camelCase, e.g. "userRepo" (参数名)'),
  /** 类型名，如 IUserRepository */
  type: z.string().describe('Type name, e.g. "IUserRepository" (类型名)'),
  /** 导入路径 */
  importPath: z
    .string()
    .describe(
      'Import path, e.g. "../../../../../domain" (导入路径)'
    ),
});

/**
 * Handler 配置定义
 */
export const handlerConfigSchema = z.object({
  /** 依赖注入项列表 */
  dependencies: z
    .array(dependencySchema)
    .optional()
    .describe("Dependency injection items (依赖注入项列表)"),
  /** 额外的 import 语句 */
  imports: z
    .array(z.string())
    .optional()
    .describe("Additional import statements (额外的 import 语句)"),
});

/**
 * 操作定义 Schema
 * 描述一个 Query 或 Mutation 操作
 */
export const operationSchema = z.object({
  /** 操作类型：query 或 mutation */
  type: z.enum(["query", "mutation"]).describe("Operation type (操作类型)"),
  /** 操作名称，使用 kebab-case */
  name: z
    .string()
    .describe(
      'Operation name in kebab-case, e.g. "check-email-exists" (kebab-case 操作名)'
    ),
  /** 操作描述，用于生成代码注释 */
  description: z
    .string()
    .optional()
    .describe("Operation description for comments (操作描述，用于注释)"),
  /** 额外的 import 语句（用于 Schema） */
  imports: z
    .array(z.string())
    .optional()
    .describe("Additional import statements for schema (Schema 的额外 import)"),
  /** 输入定义：字段数组 或 Schema 引用 */
  input: z
    .union([z.array(fieldDefinitionSchema), refDefinitionSchema])
    .describe(
      "Input definition: array of fields or schema reference (输入定义：字段数组或 Schema 引用)"
    ),
  /** 输出定义：字段数组 或 Schema 引用 */
  output: z
    .union([z.array(fieldDefinitionSchema), refDefinitionSchema])
    .describe(
      "Output definition: array of fields or schema reference (输出定义：字段数组或 Schema 引用)"
    ),
  /** 是否生成 Handler（默认 true） */
  generateHandler: z
    .boolean()
    .optional()
    .describe("Whether to generate Command/Query + Handler (是否生成 Handler，默认 true)"),
  /** Handler 配置 */
  handler: handlerConfigSchema
    .optional()
    .describe("Handler configuration (Handler 配置)"),
});

// ============================================================================
// 工具输入 Schema
// ============================================================================

/**
 * 工具输入参数 Schema
 */
export const inputSchema = {
  /** 基础路径（聚合的 use-case 目录） */
  basePath: z
    .string()
    .describe(
      "Base path for the aggregate use-case directory (聚合 use-case 目录的基础路径)"
    ),
  /** @module 路径（可选，不提供则从 basePath 推断） */
  modulePath: z
    .string()
    .optional()
    .describe(
      "Module path for @module annotation, inferred from basePath if not provided (@module 路径)"
    ),
  /** 聚合名称（用于推断 Repository 等依赖） */
  aggregateName: z
    .string()
    .optional()
    .describe(
      'Aggregate name for inferring dependencies, e.g. "User" (聚合名称，用于推断依赖)'
    ),
  /** 操作列表 */
  operations: z
    .array(operationSchema)
    .min(1)
    .describe("List of operations to generate (要生成的操作列表)"),
};

// ============================================================================
// 类型导出
// ============================================================================

export type FieldDefinition = z.infer<typeof fieldDefinitionSchema>;
export type RefDefinition = z.infer<typeof refDefinitionSchema>;
export type Dependency = z.infer<typeof dependencySchema>;
export type HandlerConfig = z.infer<typeof handlerConfigSchema>;
export type Operation = z.infer<typeof operationSchema>;
export type OperationType = Operation["type"];
export type InputType = z.infer<z.ZodObject<typeof inputSchema>>;
