/**
 * 领域分析状态管理器
 *
 * 借鉴 Zustand 设计理念：
 * - 单一状态源
 * - 不可变更新
 * - 选择器模式
 * - 独立无外部依赖（便于拆包复用）
 */

import type {
  AggregateRoot,
  AnalysisMeta,
  AnalysisStats,
  BoundedContext,
  DomainEvent,
  DomainRelation,
  DomainService,
  DomainState,
  Entity,
  RelationType,
  Repository,
  ValueObject,
} from "../types";
import type { AnalysisOptions } from "../types/input.schema";
import type { OutputType } from "../types/output.schema";

// ============================================================================
// 状态类型定义
// ============================================================================

/**
 * 领域分析状态
 */
export interface DomainAnalysisState {
  /** 分析配置 */
  config: AnalysisOptions;

  /** 限界上下文 */
  contexts: Map<string, BoundedContext>;

  /** 聚合根 */
  aggregates: Map<string, AggregateRoot>;

  /** 实体 */
  entities: Map<string, Entity>;

  /** 值对象 */
  valueObjects: Map<string, ValueObject>;

  /** 领域事件 */
  domainEvents: Map<string, DomainEvent>;

  /** 领域服务 */
  domainServices: Map<string, DomainService>;

  /** 领域状态 */
  domainStates: Map<string, DomainState>;

  /** 仓储接口 */
  repositories: Map<string, Repository>;

  /** 关系图 */
  relations: DomainRelation[];

  /** 分析元数据 */
  meta: AnalysisMeta;

  /** 扫描的文件数 */
  scannedFiles: number;
}

/**
 * Store 操作接口
 */
export interface DomainAnalysisActions {
  // 配置操作
  setConfig: (config: AnalysisOptions) => void;
  updateMeta: (updates: Partial<AnalysisMeta>) => void;

  // 注册操作
  registerContext: (context: BoundedContext) => void;
  registerAggregate: (aggregate: AggregateRoot) => void;
  registerEntity: (entity: Entity) => void;
  registerValueObject: (vo: ValueObject) => void;
  registerDomainEvent: (event: DomainEvent) => void;
  registerDomainService: (service: DomainService) => void;
  registerDomainState: (state: DomainState) => void;
  registerRepository: (repo: Repository) => void;
  addRelation: (relation: DomainRelation) => void;
  incrementScannedFiles: () => void;

  // 查询操作（选择器）
  getContext: (id: string) => BoundedContext | undefined;
  getContexts: () => BoundedContext[];
  getAggregate: (id: string) => AggregateRoot | undefined;
  getAggregates: () => AggregateRoot[];
  getAggregatesByContext: (contextId: string) => AggregateRoot[];
  getEntities: () => Entity[];
  getEntitiesByContext: (contextId: string) => Entity[];
  getValueObjects: () => ValueObject[];
  getValueObjectsByContext: (contextId: string) => ValueObject[];
  getDomainEvents: () => DomainEvent[];
  getDomainServices: () => DomainService[];
  getDomainStates: () => DomainState[];
  getRepositories: () => Repository[];
  getRelations: () => DomainRelation[];

  // 工具方法
  computeStats: () => AnalysisStats;
  toJSON: () => OutputType;
  reset: () => void;
}

/**
 * 完整的 Store 类型
 */
export type DomainAnalysisStore = DomainAnalysisState & DomainAnalysisActions;

// ============================================================================
// 初始状态工厂
// ============================================================================

/**
 * 关系去重
 * 使用 sourceId + targetId + type 作为唯一键
 */
function deduplicateRelations(relations: DomainRelation[]): DomainRelation[] {
  const seen = new Set<string>();
  const unique: DomainRelation[] = [];

  for (const relation of relations) {
    const key = `${relation.sourceId}|${relation.targetId}|${relation.type}`;
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(relation);
    }
  }

  return unique;
}

/**
 * 创建初始状态
 */
function createInitialState(
  entryPath: string,
  config?: Partial<AnalysisOptions>
): DomainAnalysisState {
  const defaultConfig: AnalysisOptions = {
    maxDepth: 10,
    excludePatterns: [
      "node_modules",
      "dist",
      "__test__",
      "*.spec.ts",
      "*.test.ts",
    ],
    outputFormat: "full",
    includeRelations: true,
    includeMethodDetails: true,
    ...config,
  };

  return {
    config: defaultConfig,
    contexts: new Map(),
    aggregates: new Map(),
    entities: new Map(),
    valueObjects: new Map(),
    domainEvents: new Map(),
    domainServices: new Map(),
    domainStates: new Map(),
    repositories: new Map(),
    relations: [],
    scannedFiles: 0,
    meta: {
      entryPath,
      analyzedAt: new Date().toISOString(),
      duration: 0,
      stats: {
        contexts: 0,
        aggregates: 0,
        entities: 0,
        valueObjects: 0,
        events: 0,
        services: 0,
        states: 0,
        repositories: 0,
        totalFiles: 0,
      },
    },
  };
}

// ============================================================================
// Store 工厂函数
// ============================================================================

/**
 * 创建领域分析状态管理器
 *
 * @param entryPath 分析入口路径
 * @param config 分析配置（可选）
 * @returns 状态管理器实例
 *
 * @example
 * ```typescript
 * const store = createDomainAnalysisStore("/path/to/domain");
 *
 * // 注册领域元素
 * store.registerContext({ id: "ctx-1", name: "identity-access", ... });
 * store.registerAggregate({ id: "agg-1", name: "User", ... });
 *
 * // 查询
 * const aggregates = store.getAggregatesByContext("ctx-1");
 *
 * // 导出结果
 * const result = store.toJSON();
 * ```
 */
export function createDomainAnalysisStore(
  entryPath: string,
  config?: Partial<AnalysisOptions>
): DomainAnalysisStore {
  // 内部状态（闭包维护）
  let state = createInitialState(entryPath, config);

  // 辅助函数：创建关系
  const createRelation = (
    sourceId: string,
    targetId: string,
    type: RelationType,
    description?: string
  ): DomainRelation => ({
    sourceId,
    targetId,
    type,
    description,
  });

  // 构建 Store 对象
  const store: DomainAnalysisStore = {
    // 代理状态属性（只读访问）
    get config() {
      return state.config;
    },
    get contexts() {
      return state.contexts;
    },
    get aggregates() {
      return state.aggregates;
    },
    get entities() {
      return state.entities;
    },
    get valueObjects() {
      return state.valueObjects;
    },
    get domainEvents() {
      return state.domainEvents;
    },
    get domainServices() {
      return state.domainServices;
    },
    get domainStates() {
      return state.domainStates;
    },
    get repositories() {
      return state.repositories;
    },
    get relations() {
      return state.relations;
    },
    get meta() {
      return state.meta;
    },
    get scannedFiles() {
      return state.scannedFiles;
    },

    // 配置操作
    setConfig(config: AnalysisOptions) {
      state = { ...state, config };
    },

    updateMeta(updates: Partial<AnalysisMeta>) {
      state = {
        ...state,
        meta: { ...state.meta, ...updates },
      };
    },

    // 注册操作
    registerContext(context: BoundedContext) {
      const newContexts = new Map(state.contexts);
      newContexts.set(context.id, context);
      state = { ...state, contexts: newContexts };
    },

    registerAggregate(aggregate: AggregateRoot) {
      const newAggregates = new Map(state.aggregates);
      newAggregates.set(aggregate.id, aggregate);
      state = { ...state, aggregates: newAggregates };

      // 自动建立关系
      const newRelations = [...state.relations];

      // 聚合包含实体
      for (const entityId of aggregate.entityIds) {
        newRelations.push(
          createRelation(aggregate.id, entityId, "contains", "聚合包含实体")
        );
      }

      // 聚合使用值对象
      for (const voId of aggregate.valueObjectIds) {
        newRelations.push(
          createRelation(aggregate.id, voId, "uses", "聚合使用值对象")
        );
      }

      // 聚合发布事件
      for (const eventId of aggregate.eventIds) {
        newRelations.push(
          createRelation(aggregate.id, eventId, "publishes", "聚合发布事件")
        );
      }

      state = { ...state, relations: newRelations };
    },

    registerEntity(entity: Entity) {
      const newEntities = new Map(state.entities);
      newEntities.set(entity.id, entity);
      state = { ...state, entities: newEntities };
    },

    registerValueObject(vo: ValueObject) {
      const newValueObjects = new Map(state.valueObjects);
      newValueObjects.set(vo.id, vo);
      state = { ...state, valueObjects: newValueObjects };
    },

    registerDomainEvent(event: DomainEvent) {
      const newEvents = new Map(state.domainEvents);
      newEvents.set(event.id, event);
      state = { ...state, domainEvents: newEvents };
    },

    registerDomainService(service: DomainService) {
      const newServices = new Map(state.domainServices);
      newServices.set(service.id, service);
      state = { ...state, domainServices: newServices };
    },

    registerDomainState(domainState: DomainState) {
      const newStates = new Map(state.domainStates);
      newStates.set(domainState.id, domainState);
      state = { ...state, domainStates: newStates };
    },

    registerRepository(repo: Repository) {
      const newRepos = new Map(state.repositories);
      newRepos.set(repo.id, repo);
      state = { ...state, repositories: newRepos };

      // 自动建立仓储管理聚合的关系
      const newRelations = [...state.relations];
      newRelations.push(
        createRelation(repo.id, repo.aggregateId, "manages", "仓储管理聚合")
      );
      state = { ...state, relations: newRelations };
    },

    addRelation(relation: DomainRelation) {
      state = { ...state, relations: [...state.relations, relation] };
    },

    incrementScannedFiles() {
      state = { ...state, scannedFiles: state.scannedFiles + 1 };
    },

    // 查询操作
    getContext(id: string) {
      return state.contexts.get(id);
    },

    getContexts() {
      return Array.from(state.contexts.values());
    },

    getAggregate(id: string) {
      return state.aggregates.get(id);
    },

    getAggregates() {
      return Array.from(state.aggregates.values());
    },

    getAggregatesByContext(contextId: string) {
      return Array.from(state.aggregates.values()).filter(
        (agg) => agg.contextId === contextId
      );
    },

    getEntities() {
      return Array.from(state.entities.values());
    },

    getEntitiesByContext(contextId: string) {
      return Array.from(state.entities.values()).filter(
        (e) => e.contextId === contextId
      );
    },

    getValueObjects() {
      return Array.from(state.valueObjects.values());
    },

    getValueObjectsByContext(contextId: string) {
      return Array.from(state.valueObjects.values()).filter(
        (vo) => vo.contextId === contextId
      );
    },

    getDomainEvents() {
      return Array.from(state.domainEvents.values());
    },

    getDomainServices() {
      return Array.from(state.domainServices.values());
    },

    getDomainStates() {
      return Array.from(state.domainStates.values());
    },

    getRepositories() {
      return Array.from(state.repositories.values());
    },

    getRelations() {
      return state.relations;
    },

    // 计算统计信息
    computeStats(): AnalysisStats {
      return {
        contexts: state.contexts.size,
        aggregates: state.aggregates.size,
        entities: state.entities.size,
        valueObjects: state.valueObjects.size,
        events: state.domainEvents.size,
        services: state.domainServices.size,
        states: state.domainStates.size,
        repositories: state.repositories.size,
        totalFiles: state.scannedFiles,
      };
    },

    // 导出 JSON
    toJSON(): OutputType {
      const stats = store.computeStats();
      const includeRelations = state.config?.includeRelations ?? true;

      // 关系去重（使用 sourceId + targetId + type 作为唯一键）
      const uniqueRelations = includeRelations
        ? deduplicateRelations(store.getRelations())
        : undefined;

      return {
        summary: {
          entryPath: state.meta.entryPath,
          analyzedAt: state.meta.analyzedAt,
          duration: state.meta.duration,
          stats,
        },
        contexts: store.getContexts(),
        elements: {
          aggregates: store.getAggregates(),
          entities: store.getEntities(),
          valueObjects: store.getValueObjects(),
          domainEvents: store.getDomainEvents(),
          domainServices: store.getDomainServices(),
          domainStates: store.getDomainStates(),
          repositories: store.getRepositories(),
        },
        relations: uniqueRelations,
      };
    },

    // 重置状态
    reset() {
      state = createInitialState(state.meta.entryPath, state.config);
    },
  };

  return store;
}
