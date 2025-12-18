/**
 * Domain Scaffold Generator - 输入 Schema 定义
 *
 * 定义工具接收的输入参数结构
 * 支持解析 DDD 结构化 JSON，生成 Domain 层占位文件
 */
import { z } from "zod";

// ============================================================================
// 实体定义（支持字符串或对象两种格式）
// ============================================================================

/**
 * 实体定义 - 对象格式
 */
const entityObjectSchema = z.object({
  name: z.string().describe("Entity filename (实体文件名)"),
  description: z.string().optional().describe("Entity description (实体描述)"),
});

/**
 * 实体定义 - 支持字符串或对象
 */
const entitySchema = z.union([z.string(), entityObjectSchema]);

// ============================================================================
// 聚合文件结构定义
// ============================================================================

/**
 * 聚合文件集合
 */
const aggregateFilesSchema = z.object({
  /** 实体文件列表 */
  entities: z
    .array(entitySchema)
    .optional()
    .describe("Entity files (实体文件列表)"),
  /** 值对象文件列表 */
  "value-objects": z
    .array(z.string())
    .optional()
    .describe("Value object files (值对象文件列表)"),
  /** 状态文件列表 */
  states: z
    .array(z.string())
    .optional()
    .describe("State files (状态文件列表)"),
  /** 事件文件列表 */
  events: z
    .array(z.string())
    .optional()
    .describe("Event files (事件文件列表)"),
});

// ============================================================================
// 聚合定义
// ============================================================================

/**
 * 聚合根定义
 */
const aggregateSchema = z.object({
  /** 聚合名称（kebab-case） */
  name: z.string().describe("Aggregate name in kebab-case (聚合名称)"),
  /** 聚合描述 */
  description: z
    .string()
    .optional()
    .describe("Aggregate description (聚合描述)"),
  /** 聚合根文件名 */
  root: z.string().describe("Aggregate root filename (聚合根文件名)"),
  /** Repository 接口文件名 */
  repository: z
    .string()
    .optional()
    .describe("Repository interface filename (仓储接口文件名)"),
  /** 聚合包含的文件 */
  files: aggregateFilesSchema
    .optional()
    .describe("Aggregate files (聚合包含的文件)"),
});

// ============================================================================
// 领域服务定义
// ============================================================================

/**
 * 领域服务定义
 */
const serviceSchema = z.object({
  /** 服务文件名 */
  name: z.string().describe("Service filename (服务文件名)"),
  /** 服务描述 */
  description: z
    .string()
    .optional()
    .describe("Service description (服务描述)"),
});

// ============================================================================
// 异常定义
// ============================================================================

/**
 * 异常目录定义
 */
const exceptionsSchema = z.object({
  /** 异常目录路径 */
  path: z.string().describe("Exceptions directory path (异常目录路径)"),
  /** 异常文件列表 */
  files: z.array(z.string()).describe("Exception files (异常文件列表)"),
});

// ============================================================================
// 层级定义
// ============================================================================

/**
 * 领域层定义
 */
const domainLayerSchema = z.object({
  /** 层级名称 */
  name: z.literal("domain"),
  /** 职责列表 */
  responsibilities: z
    .array(z.string())
    .optional()
    .describe("Layer responsibilities (层级职责)"),
  /** 聚合列表 */
  aggregates: z
    .array(aggregateSchema)
    .optional()
    .describe("Aggregates (聚合列表)"),
  /** 领域服务列表 */
  services: z
    .array(serviceSchema)
    .optional()
    .describe("Domain services (领域服务列表)"),
  /** 异常定义 */
  exceptions: exceptionsSchema
    .optional()
    .describe("Exceptions (异常定义)"),
});

/**
 * 其他层级定义（infrastructure/application/presentation）
 * 仅作占位，不生成文件
 */
const otherLayerSchema = z.object({
  name: z.enum(["infrastructure", "application", "presentation"]),
  responsibilities: z.array(z.string()).optional(),
});

/**
 * 层级联合类型
 */
const layerSchema = z.union([domainLayerSchema, otherLayerSchema]);

// ============================================================================
// 子域定义
// ============================================================================

/**
 * 子域类型
 */
const subdomainTypeSchema = z.enum([
  "core-domain",
  "supporting-domain",
  "generic-domain",
]);

/**
 * 子域定义
 */
const subdomainSchema = z.object({
  /** 子域名称（用作目录名，必填） */
  name: z
    .string()
    .describe(
      "Subdomain name used as directory name, e.g. 'user-management', 'wallet-account'. " +
      "Must be kebab-case. Do NOT use type values like 'core-domain' as name. " +
      "(子域名称，用作目录名，必填。使用 kebab-case 格式，不要使用 type 值作为名称)"
    ),
  /** 子域类型（分类用途，不影响目录结构） */
  type: subdomainTypeSchema.describe(
    "Subdomain type for classification only, does not affect directory structure " +
    "(子域类型，仅用于分类，不影响目录结构)"
  ),
  /** 子域描述 */
  description: z
    .string()
    .optional()
    .describe("Subdomain description (子域描述)"),
  /** 层级列表 */
  layers: z.array(layerSchema).describe("Layers (层级列表)"),
});

// ============================================================================
// 限界上下文定义
// ============================================================================

/**
 * 限界上下文定义
 */
const contextSchema = z.object({
  /** 上下文名称 */
  name: z.string().describe("Bounded Context name (限界上下文名称)"),
  /** 上下文类型 */
  type: z
    .literal("bounded-context")
    .optional()
    .describe("Bounded Context type (限界上下文类型)"),
  /** 上下文描述 */
  description: z
    .string()
    .optional()
    .describe("Bounded Context description (限界上下文描述)"),
  /** 子域列表 */
  subdomains: z.array(subdomainSchema).describe("Subdomains (子域列表)"),
});

// ============================================================================
// DDD 架构结构定义
// ============================================================================

/**
 * DDD 架构结构
 */
const architectureSchema = z.object({
  /** 架构名称 */
  name: z.string().optional().describe("Architecture name (架构名称)"),
  /** 限界上下文列表 */
  contexts: z.array(contextSchema).describe("Bounded contexts (限界上下文列表)"),
});

/**
 * 结构定义包装
 */
const structureSchema = z.object({
  architecture: architectureSchema,
});

// ============================================================================
// 生成选项定义
// ============================================================================

/**
 * 生成选项
 */
const optionsSchema = z.object({
  /** 占位文件后缀 */
  placeholderSuffix: z
    .string()
    .default(".keep")
    .describe("Placeholder file suffix, default '.keep' (占位文件后缀)"),
  /** 是否覆盖已存在文件 */
  overwrite: z
    .boolean()
    .default(false)
    .describe("Overwrite existing files (是否覆盖已存在文件)"),
});

// ============================================================================
// 输入 Schema
// ============================================================================

/**
 * 工具输入 Schema
 */
export const inputSchema = {
  /** 目标输出路径（绝对路径） */
  outputPath: z
    .string()
    .describe("Target output directory absolute path (输出目标绝对路径)"),
  /** DDD 结构定义 */
  structure: structureSchema.describe(
    "DDD architecture structure definition (DDD 架构结构定义)"
  ),
  /** 生成选项 */
  options: optionsSchema
    .optional()
    .describe("Generation options (生成选项)"),
};

// ============================================================================
// 类型导出
// ============================================================================

export type InputType = z.infer<z.ZodObject<typeof inputSchema>>;
export type ContextType = z.infer<typeof contextSchema>;
export type SubdomainType = z.infer<typeof subdomainSchema>;
export type DomainLayerType = z.infer<typeof domainLayerSchema>;
export type AggregateType = z.infer<typeof aggregateSchema>;
export type ServiceType = z.infer<typeof serviceSchema>;
export type ExceptionsType = z.infer<typeof exceptionsSchema>;
export type OptionsType = z.infer<typeof optionsSchema>;
