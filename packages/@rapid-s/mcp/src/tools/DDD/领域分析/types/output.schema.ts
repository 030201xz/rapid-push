/**
 * 输出 Schema 定义
 */
import { z } from "zod";

// ============================================================================
// 基础 Schema
// ============================================================================

/** 属性信息 Schema */
export const propertyInfoSchema = z.object({
  name: z.string(),
  type: z.string(),
  isOptional: z.boolean(),
  isReadonly: z.boolean(),
  accessibility: z.enum(["public", "protected", "private"]).optional(),
  description: z.string().optional(),
});

/** 参数信息 Schema */
export const parameterInfoSchema = z.object({
  name: z.string(),
  type: z.string(),
  isOptional: z.boolean(),
  defaultValue: z.string().optional(),
  description: z.string().optional(),
});

/** 方法信息 Schema */
export const methodInfoSchema = z.object({
  name: z.string(),
  parameters: z.array(parameterInfoSchema),
  returnType: z.string(),
  isAsync: z.boolean(),
  isStatic: z.boolean(),
  accessibility: z.enum(["public", "protected", "private"]).optional(),
  description: z.string().optional(),
  lineNumber: z.number(),
});

/** 装饰器信息 Schema */
export const decoratorInfoSchema = z.object({
  name: z.string(),
  arguments: z.array(z.string()).optional(),
});

// ============================================================================
// 领域元素 Schema
// ============================================================================

/** 子域信息 Schema */
export const subdomainInfoSchema = z.object({
  name: z.string(),
  path: z.string(),
  hasDomain: z.boolean(),
});

/** 限界上下文 Schema */
export const boundedContextSchema = z.object({
  id: z.string(),
  name: z.string(),
  path: z.string(),
  subdomains: z.array(subdomainInfoSchema),
  description: z.string().optional(),
});

/** 领域元素基础 Schema */
const baseDomainElementSchema = z.object({
  id: z.string(),
  name: z.string(),
  contextId: z.string(),
  filePath: z.string(),
  description: z.string().optional(),
  decorators: z.array(decoratorInfoSchema),
  lineNumber: z.number(),
});

/** 聚合根 Schema */
export const aggregateRootSchema = baseDomainElementSchema.extend({
  className: z.string(),
  properties: z.array(propertyInfoSchema),
  methods: z.array(methodInfoSchema),
  extendsClass: z.string().optional(),
  implementsInterfaces: z.array(z.string()),
  entityIds: z.array(z.string()),
  valueObjectIds: z.array(z.string()),
  eventIds: z.array(z.string()),
  repositoryId: z.string().optional(),
});

/** 实体 Schema */
export const entitySchema = baseDomainElementSchema.extend({
  className: z.string(),
  aggregateId: z.string().optional(),
  properties: z.array(propertyInfoSchema),
  methods: z.array(methodInfoSchema),
  extendsClass: z.string().optional(),
  implementsInterfaces: z.array(z.string()),
});

/** 值对象 Schema */
export const valueObjectSchema = baseDomainElementSchema.extend({
  className: z.string(),
  aggregateId: z.string().optional(),
  properties: z.array(propertyInfoSchema),
  methods: z.array(methodInfoSchema),
  isImmutable: z.boolean(),
  validationRules: z.array(z.string()),
  extendsClass: z.string().optional(),
});

/** 领域事件元数据 Schema */
export const domainEventMetadataSchema = z.object({
  eventDotName: z.string().optional(),
  aggregateType: z.string().optional(),
  version: z.number().optional(),
});

/** 领域事件 Schema */
export const domainEventSchema = baseDomainElementSchema.extend({
  className: z.string(),
  aggregateId: z.string().optional(),
  payload: z.array(propertyInfoSchema),
  extendsClass: z.string().optional(),
  metadata: domainEventMetadataSchema.optional(),
});

/** 领域服务 Schema */
export const domainServiceSchema = baseDomainElementSchema.extend({
  className: z.string(),
  methods: z.array(methodInfoSchema),
  dependencies: z.array(parameterInfoSchema),
  extendsClass: z.string().optional(),
  implementsInterfaces: z.array(z.string()),
});

/** 状态转换 Schema */
export const stateTransitionSchema = z.object({
  from: z.string(),
  to: z.string(),
  trigger: z.string().optional(),
});

/** 领域状态 Schema */
export const domainStateSchema = baseDomainElementSchema.extend({
  typeName: z.string(),
  states: z.array(z.string()),
  transitions: z.array(stateTransitionSchema),
  isEnum: z.boolean(),
});

/** 仓储方法 Schema */
export const repositoryMethodSchema = methodInfoSchema.extend({
  operationType: z.enum(["query", "command", "unknown"]),
});

/** 仓储接口 Schema */
export const repositorySchema = baseDomainElementSchema.extend({
  interfaceName: z.string(),
  aggregateId: z.string(),
  aggregateType: z.string(),
  methods: z.array(repositoryMethodSchema),
  extendsInterfaces: z.array(z.string()),
});

/** 领域关系 Schema */
export const domainRelationSchema = z.object({
  sourceId: z.string(),
  targetId: z.string(),
  type: z.enum([
    "contains",
    "uses",
    "publishes",
    "manages",
    "extends",
    "implements",
  ]),
  description: z.string().optional(),
});

// ============================================================================
// 输出 Schema
// ============================================================================

/** 分析统计 Schema */
export const analysisStatsSchema = z.object({
  contexts: z.number(),
  aggregates: z.number(),
  entities: z.number(),
  valueObjects: z.number(),
  events: z.number(),
  services: z.number(),
  states: z.number(),
  repositories: z.number(),
  totalFiles: z.number(),
});

/** 分析概要 Schema */
export const analysisSummarySchema = z.object({
  entryPath: z.string(),
  analyzedAt: z.string(),
  duration: z.number(),
  stats: analysisStatsSchema,
});

/** 领域元素集合 Schema */
export const domainElementsSchema = z.object({
  aggregates: z.array(aggregateRootSchema),
  entities: z.array(entitySchema),
  valueObjects: z.array(valueObjectSchema),
  domainEvents: z.array(domainEventSchema),
  domainServices: z.array(domainServiceSchema),
  domainStates: z.array(domainStateSchema),
  repositories: z.array(repositorySchema),
});

/** 完整输出 Schema（对象形式，供 BaseTool 使用） */
export const outputSchema = {
  /** 分析概要 */
  summary: analysisSummarySchema,

  /** 限界上下文列表 */
  contexts: z.array(boundedContextSchema),

  /** 领域元素（扁平化） */
  elements: domainElementsSchema,

  /** 关系图（可选） */
  relations: z.array(domainRelationSchema).optional(),
};

/**
 * 输出类型
 */
export type OutputType = z.infer<z.ZodObject<typeof outputSchema>>;
