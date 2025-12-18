/**
 * 领域模型类型定义
 *
 * 纯粹的领域结构描述，不涉及任何代码生成建议
 */

// ============================================================================
// 基础类型
// ============================================================================

/**
 * 属性信息
 */
export interface PropertyInfo {
  /** 属性名 */
  name: string;
  /** TypeScript 类型 */
  type: string;
  /** 是否可选 */
  isOptional: boolean;
  /** 是否只读 */
  isReadonly: boolean;
  /** 访问修饰符 */
  accessibility?: "public" | "protected" | "private";
  /** JSDoc 描述 */
  description?: string;
}

/**
 * 参数信息
 */
export interface ParameterInfo {
  /** 参数名 */
  name: string;
  /** TypeScript 类型 */
  type: string;
  /** 是否可选 */
  isOptional: boolean;
  /** 默认值（如有） */
  defaultValue?: string;
  /** JSDoc 描述 */
  description?: string;
}

/**
 * 方法信息
 */
export interface MethodInfo {
  /** 方法名 */
  name: string;
  /** 参数列表 */
  parameters: ParameterInfo[];
  /** 返回类型 */
  returnType: string;
  /** 是否异步 */
  isAsync: boolean;
  /** 是否静态 */
  isStatic: boolean;
  /** 访问修饰符 */
  accessibility?: "public" | "protected" | "private";
  /** JSDoc 描述 */
  description?: string;
  /** 所在行号 */
  lineNumber: number;
}

/**
 * 装饰器信息
 */
export interface DecoratorInfo {
  /** 装饰器名称 */
  name: string;
  /** 装饰器参数（字符串化） */
  arguments?: string[];
}

// ============================================================================
// 领域元素类型
// ============================================================================

/**
 * 领域元素类型枚举
 */
export type DomainElementType =
  | "bounded-context"
  | "aggregate"
  | "entity"
  | "value-object"
  | "domain-event"
  | "domain-service"
  | "domain-state"
  | "repository";

/**
 * 领域元素基础接口
 */
export interface BaseDomainElement {
  /** 唯一标识（路径派生） */
  id: string;
  /** 元素名称 */
  name: string;
  /** 所属限界上下文 ID */
  contextId: string;
  /** 文件绝对路径 */
  filePath: string;
  /** JSDoc 描述 */
  description?: string;
  /** 装饰器列表 */
  decorators: DecoratorInfo[];
  /** 所在行号 */
  lineNumber: number;
}

// ============================================================================
// 限界上下文
// ============================================================================

/**
 * 限界上下文
 */
export interface BoundedContext {
  /** 唯一标识 */
  id: string;
  /** 上下文名称（如 identity-access） */
  name: string;
  /** 目录绝对路径 */
  path: string;
  /** 子域列表 */
  subdomains: SubdomainInfo[];
  /** JSDoc 描述 */
  description?: string;
}

/**
 * 子域信息
 */
export interface SubdomainInfo {
  /** 子域名称（如 user-management） */
  name: string;
  /** 目录路径 */
  path: string;
  /** 是否包含 domain 目录 */
  hasDomain: boolean;
}

// ============================================================================
// 聚合根
// ============================================================================

/**
 * 聚合根
 */
export interface AggregateRoot extends BaseDomainElement {
  /** 类名（如 UserAggregate） */
  className: string;
  /** 属性列表 */
  properties: PropertyInfo[];
  /** 方法列表 */
  methods: MethodInfo[];
  /** 继承的基类 */
  extendsClass?: string;
  /** 实现的接口 */
  implementsInterfaces: string[];
  /** 关联的实体 ID 列表 */
  entityIds: string[];
  /** 使用的值对象 ID 列表 */
  valueObjectIds: string[];
  /** 发布的事件 ID 列表 */
  eventIds: string[];
  /** 对应的仓储接口 ID */
  repositoryId?: string;
}

// ============================================================================
// 实体
// ============================================================================

/**
 * 实体
 */
export interface Entity extends BaseDomainElement {
  /** 类名 */
  className: string;
  /** 所属聚合 ID（可选，独立实体无此字段） */
  aggregateId?: string;
  /** 属性列表 */
  properties: PropertyInfo[];
  /** 方法列表 */
  methods: MethodInfo[];
  /** 继承的基类 */
  extendsClass?: string;
  /** 实现的接口 */
  implementsInterfaces: string[];
}

// ============================================================================
// 值对象
// ============================================================================

/**
 * 值对象
 */
export interface ValueObject extends BaseDomainElement {
  /** 类名 */
  className: string;
  /** 所属聚合 ID（可选） */
  aggregateId?: string;
  /** 属性列表 */
  properties: PropertyInfo[];
  /** 方法列表（通常包含工厂方法、验证方法等） */
  methods: MethodInfo[];
  /** 是否不可变（通过 readonly 属性判断） */
  isImmutable: boolean;
  /** 验证规则描述（从 JSDoc 或方法名推断） */
  validationRules: string[];
  /** 继承的基类 */
  extendsClass?: string;
}

// ============================================================================
// 领域事件
// ============================================================================

/**
 * 领域事件元数据（从 defineEvent 调用中提取）
 */
export interface DomainEventMetadata {
  /** 事件点分名称 (如 'wallet.account.created') */
  eventDotName?: string;
  /** 聚合类型名称 */
  aggregateType?: string;
  /** 事件版本号 */
  version?: number;
}

/**
 * 领域事件
 */
export interface DomainEvent extends BaseDomainElement {
  /** 类名 */
  className: string;
  /** 触发此事件的聚合 ID */
  aggregateId?: string;
  /** 事件载荷属性 */
  payload: PropertyInfo[];
  /** 继承的基类 */
  extendsClass?: string;
  /** defineEvent 元数据（使用函数调用模式时） */
  metadata?: DomainEventMetadata;
}

// ============================================================================
// 领域服务
// ============================================================================

/**
 * 领域服务
 */
export interface DomainService extends BaseDomainElement {
  /** 类名 */
  className: string;
  /** 方法列表 */
  methods: MethodInfo[];
  /** 依赖注入项（构造函数参数） */
  dependencies: ParameterInfo[];
  /** 继承的基类 */
  extendsClass?: string;
  /** 实现的接口 */
  implementsInterfaces: string[];
}

// ============================================================================
// 领域状态
// ============================================================================

/**
 * 状态转换规则
 */
export interface StateTransition {
  /** 起始状态 */
  from: string;
  /** 目标状态 */
  to: string;
  /** 触发条件/方法名 */
  trigger?: string;
}

/**
 * 领域状态
 */
export interface DomainState extends BaseDomainElement {
  /** 类型名（枚举或联合类型） */
  typeName: string;
  /** 状态值列表 */
  states: string[];
  /** 状态转换规则 */
  transitions: StateTransition[];
  /** 是否是枚举类型 */
  isEnum: boolean;
}

// ============================================================================
// 仓储接口
// ============================================================================

/**
 * 仓储方法
 */
export interface RepositoryMethod extends MethodInfo {
  /** 操作类型 */
  operationType: "query" | "command" | "unknown";
}

/**
 * 仓储接口
 */
export interface Repository extends BaseDomainElement {
  /** 接口名 */
  interfaceName: string;
  /** 管理的聚合 ID */
  aggregateId: string;
  /** 管理的聚合类型名 */
  aggregateType: string;
  /** 仓储方法列表 */
  methods: RepositoryMethod[];
  /** 继承的接口 */
  extendsInterfaces: string[];
}

// ============================================================================
// 关系定义
// ============================================================================

/**
 * 领域元素间的关系类型
 */
export type RelationType =
  | "contains" // 聚合包含实体/值对象
  | "uses" // 使用关系
  | "publishes" // 发布事件
  | "manages" // 仓储管理聚合
  | "extends" // 继承关系
  | "implements"; // 实现关系

/**
 * 领域关系
 */
export interface DomainRelation {
  /** 源元素 ID */
  sourceId: string;
  /** 目标元素 ID */
  targetId: string;
  /** 关系类型 */
  type: RelationType;
  /** 关系描述 */
  description?: string;
}

// ============================================================================
// 分析元数据
// ============================================================================

/**
 * 分析统计信息
 */
export interface AnalysisStats {
  /** 限界上下文数量 */
  contexts: number;
  /** 聚合根数量 */
  aggregates: number;
  /** 实体数量 */
  entities: number;
  /** 值对象数量 */
  valueObjects: number;
  /** 领域事件数量 */
  events: number;
  /** 领域服务数量 */
  services: number;
  /** 领域状态数量 */
  states: number;
  /** 仓储接口数量 */
  repositories: number;
  /** 扫描的文件总数 */
  totalFiles: number;
}

/**
 * 分析元数据
 */
export interface AnalysisMeta {
  /** 入口路径 */
  entryPath: string;
  /** 分析时间 */
  analyzedAt: string;
  /** 耗时（毫秒） */
  duration: number;
  /** 统计信息 */
  stats: AnalysisStats;
}
