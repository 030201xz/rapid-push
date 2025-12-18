/**
 * 中间表示层 (Intermediate Representation)
 *
 * 定义解析后的内部数据模型，与输入格式解耦
 * 后续所有处理（渲染、写入）都基于 IR 进行
 *
 * 支持生成：
 * - DTO Schema (input.schema.ts, output.schema.ts)
 * - Command/Query 类 ({name}.command.ts, {name}.query.ts)
 * - Handler 类 ({name}.handler.ts)
 */

// ============================================================================
// 字段与引用
// ============================================================================

/**
 * 解析后的字段
 * zodExpression 已经过 v3→v4 迁移处理
 */
export interface IRField {
  /** 字段名 */
  name: string;
  /** Zod 表达式（已迁移到 v4 API） */
  zodExpression: string;
  /** 字段注释 */
  comment?: string;
}

/**
 * 解析后的 Schema 引用
 */
export interface IRSchemaRef {
  /** Schema 名称 */
  schemaName: string;
  /** 导入路径 */
  importPath: string;
  /** 链式转换，如 ".nullable()" */
  transform?: string;
}

// ============================================================================
// Schema 定义
// ============================================================================

/**
 * Schema 定义的类型判别
 */
export type IRSchemaKind = "object" | "reference";

/**
 * 对象类型的 Schema 定义
 */
export interface IRObjectSchema {
  kind: "object";
  /** 字段列表 */
  fields: IRField[];
  /** 需要的 import 语句（已收集去重） */
  imports: string[];
}

/**
 * 引用类型的 Schema 定义
 */
export interface IRReferenceSchema {
  kind: "reference";
  /** 引用信息 */
  ref: IRSchemaRef;
  /** 需要的 import 语句（已收集去重） */
  imports: string[];
}

/**
 * Schema 定义联合类型
 */
export type IRSchemaDefinition = IRObjectSchema | IRReferenceSchema;

// ============================================================================
// 操作定义
// ============================================================================

/**
 * 操作类型
 */
export type IROperationType = "query" | "mutation";

/**
 * 解析后的操作
 * 包含预计算的命名变体，避免重复转换
 */
export interface IROperation {
  /** 原始名称（kebab-case） */
  name: string;
  /** camelCase 命名 */
  camelName: string;
  /** PascalCase 命名 */
  pascalName: string;
  /** 操作类型 */
  type: IROperationType;
  /** 操作描述 */
  description?: string;
  /** 输入 Schema 定义 */
  input: IRSchemaDefinition;
  /** 输出 Schema 定义 */
  output: IRSchemaDefinition;
  /** 是否生成 Handler（Command/Query + Handler） */
  generateHandler: boolean;
  /** Handler 配置 */
  handlerConfig?: IRHandlerConfig;
}

// ============================================================================
// Handler 配置
// ============================================================================

/**
 * 依赖注入项
 */
export interface IRDependency {
  /** 参数名（camelCase），如 userRepo */
  name: string;
  /** 类型名，如 IUserRepository */
  type: string;
  /** 导入路径 */
  importPath: string;
}

/**
 * Handler 配置
 */
export interface IRHandlerConfig {
  /** 依赖注入项列表 */
  dependencies: IRDependency[];
  /** 额外的 import 语句 */
  imports: string[];
}

// ============================================================================
// 生成计划
// ============================================================================

/**
 * 解析后的完整生成计划
 * 包含所有需要生成的操作，按类型分组
 */
export interface IRGenerationPlan {
  /** 目标基础路径 */
  basePath: string;
  /** 模块路径（用于 @module 注释） */
  modulePath: string;
  /** Mutation 操作列表 */
  mutations: IROperation[];
  /** Query 操作列表 */
  queries: IROperation[];
}

// ============================================================================
// 文件生成
// ============================================================================

/**
 * 待写入的文件
 */
export interface IRFileToWrite {
  /** 文件绝对路径 */
  path: string;
  /** 文件内容（未格式化） */
  content: string;
  /** 文件类型标识 */
  type: IRFileType;
}

/**
 * 文件类型
 */
export type IRFileType =
  | "input-schema"
  | "output-schema"
  | "command"
  | "query"
  | "handler"
  | "index";

/**
 * 写入结果
 */
export interface IRWriteResult {
  /** 文件路径 */
  path: string;
  /** 文件类型 */
  type: IRFileType;
  /** 是否成功 */
  success: boolean;
  /** 错误信息（如果失败） */
  error?: string;
}

// ============================================================================
// 类型守卫
// ============================================================================

/**
 * 判断 Schema 定义是否为对象类型
 */
export function isObjectSchema(
  schema: IRSchemaDefinition
): schema is IRObjectSchema {
  return schema.kind === "object";
}

/**
 * 判断 Schema 定义是否为引用类型
 */
export function isReferenceSchema(
  schema: IRSchemaDefinition
): schema is IRReferenceSchema {
  return schema.kind === "reference";
}
