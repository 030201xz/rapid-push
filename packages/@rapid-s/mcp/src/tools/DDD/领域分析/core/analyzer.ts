/**
 * 领域分析器
 *
 * 编排扫描器和各解析器，完成领域结构分析
 */

import * as path from "node:path";
import type { InputType } from "../types/input.schema";
import type { OutputType } from "../types/output.schema";
import { createDomainAnalysisStore, type DomainAnalysisStore } from "./store";
import { scanDomains, type DiscoveredDomain } from "./scanner";
import { DomainAnalysisError } from "./errors";
import {
  matchByFileName,
  matchByDirectory,
} from "../ast/pattern-matcher";
import {
  parseAggregate,
  parseEntity,
  parseValueObject,
  parseDomainEvent,
  parseDomainService,
  parseDomainState,
  parseRepository,
} from "../parsers";

// ============================================================================
// 分析器配置
// ============================================================================

/**
 * 文件类型到解析器的映射
 */
const FILE_TYPE_PARSERS = {
  aggregate: parseAggregate,
  entity: parseEntity,
  "value-object": parseValueObject,
  "domain-event": parseDomainEvent,
  "domain-service": parseDomainService,
  "domain-state": parseDomainState,
  repository: parseRepository,
} as const;

// ============================================================================
// 分析器实现
// ============================================================================

/**
 * 分析单个领域目录
 */
function analyzeDomain(
  domain: DiscoveredDomain,
  store: DomainAnalysisStore
): void {
  for (const filePath of domain.files) {
    const fileName = path.basename(filePath);
    const dirName = path.basename(path.dirname(filePath));

    // 通过文件名匹配元素类型
    let match = matchByFileName(fileName);

    // 如果文件名无法匹配，尝试通过目录名匹配
    if (!match) {
      const dirType = matchByDirectory(dirName);
      if (dirType) {
        match = { type: dirType, confidence: 0.7, matchedBy: ["directory"] };
      }
    }

    // 跳过无法识别的文件（如 index.ts）
    if (!match) {
      store.incrementScannedFiles();
      continue;
    }

    // 调用对应的解析器
    const parser = FILE_TYPE_PARSERS[match.type as keyof typeof FILE_TYPE_PARSERS];

    if (!parser) {
      store.incrementScannedFiles();
      continue;
    }

    try {
      const result = parser(filePath, domain.contextId);

      if (result) {
        // 根据类型注册到 Store
        switch (match.type) {
          case "aggregate":
            store.registerAggregate(result as ReturnType<typeof parseAggregate> & object);
            break;
          case "entity":
            store.registerEntity(result as ReturnType<typeof parseEntity> & object);
            break;
          case "value-object":
            store.registerValueObject(result as ReturnType<typeof parseValueObject> & object);
            break;
          case "domain-event":
            store.registerDomainEvent(result as ReturnType<typeof parseDomainEvent> & object);
            break;
          case "domain-service":
            store.registerDomainService(result as ReturnType<typeof parseDomainService> & object);
            break;
          case "domain-state":
            store.registerDomainState(result as ReturnType<typeof parseDomainState> & object);
            break;
          case "repository":
            store.registerRepository(result as ReturnType<typeof parseRepository> & object);
            break;
        }
      }
    } catch (error) {
      // 单个文件解析失败不应中断整体分析
      console.warn(`解析文件失败: ${filePath}`, error);
    }

    store.incrementScannedFiles();
  }
}

/**
 * 建立领域元素间的关联关系
 *
 * 在所有元素解析完成后，基于命名约定和类型引用建立关联
 */
function establishRelations(store: DomainAnalysisStore): void {
  const aggregates = store.getAggregates();
  const repositories = store.getRepositories();
  const valueObjects = store.getValueObjects();
  const entities = store.getEntities();

  // 关联仓储和聚合
  for (const repo of repositories) {
    const aggregate = aggregates.find(
      (agg) =>
        agg.contextId === repo.contextId &&
        (agg.name.toLowerCase() === repo.aggregateType.toLowerCase() ||
          agg.className === repo.aggregateType)
    );

    if (aggregate) {
      // 更新聚合的仓储引用
      const updatedAggregate = { ...aggregate, repositoryId: repo.id };
      store.registerAggregate(updatedAggregate);

      // 更新仓储的聚合引用
      const updatedRepo = { ...repo, aggregateId: aggregate.id };
      store.registerRepository(updatedRepo);
    }
  }

  // 关联值对象和聚合
  for (const vo of valueObjects) {
    // 找到同一上下文中使用此值对象的聚合
    for (const agg of aggregates) {
      if (agg.contextId !== vo.contextId) continue;

      // 检查聚合属性是否使用了此值对象
      const usesVO = agg.properties.some(
        (prop) =>
          prop.type.includes(vo.className) || prop.type.includes(vo.name)
      );

      if (usesVO) {
        // 更新值对象的聚合引用
        const updatedVO = { ...vo, aggregateId: agg.id };
        store.registerValueObject(updatedVO);

        // 确保聚合的 valueObjectIds 包含此值对象
        if (!agg.valueObjectIds.includes(vo.id)) {
          const updatedAgg = {
            ...agg,
            valueObjectIds: [...agg.valueObjectIds, vo.id],
          };
          store.registerAggregate(updatedAgg);
        }
      }
    }
  }

  // 关联实体和聚合
  for (const entity of entities) {
    // 找到同一上下文中包含此实体的聚合
    for (const agg of aggregates) {
      if (agg.contextId !== entity.contextId) continue;

      // 检查聚合属性是否使用了此实体
      const usesEntity = agg.properties.some(
        (prop) =>
          prop.type.includes(entity.className) ||
          prop.type.includes(entity.name)
      );

      if (usesEntity) {
        // 更新实体的聚合引用
        const updatedEntity = { ...entity, aggregateId: agg.id };
        store.registerEntity(updatedEntity);

        // 确保聚合的 entityIds 包含此实体
        if (!agg.entityIds.includes(entity.id)) {
          const updatedAgg = {
            ...agg,
            entityIds: [...agg.entityIds, entity.id],
          };
          store.registerAggregate(updatedAgg);
        }
      }
    }
  }
}

/**
 * 分析选项类型（所有字段可选）
 */
type AnalysisOptionsInput = Partial<InputType["options"]>;

// ============================================================================
// 公开接口
// ============================================================================

/**
 * 分析领域结构
 *
 * @param entryPath 入口路径
 * @param options 分析选项
 * @returns 分析结果
 *
 * @example
 * ```typescript
 * const result = await analyzeDomain(
 *   "/path/to/context-user/identity-access",
 *   { maxDepth: 10, includeRelations: true }
 * );
 *
 * console.log(result.summary.stats);
 * console.log(result.contexts);
 * console.log(result.elements.aggregates);
 * ```
 */
export async function analyzeDomainStructure(
  entryPath: string,
  options: AnalysisOptionsInput = {}
): Promise<OutputType> {
  const startTime = Date.now();

  // 合并默认选项
  const mergedOptions = {
    maxDepth: options.maxDepth ?? 10,
    excludePatterns: options.excludePatterns ?? [
      "node_modules",
      "dist",
      "__test__",
      "*.spec.ts",
      "*.test.ts",
    ],
    outputFormat: options.outputFormat ?? "full" as const,
    includeRelations: options.includeRelations ?? true,
    includeMethodDetails: options.includeMethodDetails ?? true,
  };

  // 创建状态管理器
  const store = createDomainAnalysisStore(entryPath, mergedOptions);

  // 扫描目录，发现所有领域
  const scanResult = scanDomains(entryPath, mergedOptions);

  // 注册发现的限界上下文
  for (const context of scanResult.contexts) {
    store.registerContext(context);
  }

  // 分析每个领域目录
  for (const domain of scanResult.domains) {
    analyzeDomain(domain, store);
  }

  // 建立关联关系
  establishRelations(store);

  // 更新分析元数据
  const duration = Date.now() - startTime;
  store.updateMeta({
    duration,
    stats: store.computeStats(),
  });

  // 导出结果
  return store.toJSON();
}

/**
 * 创建分析器实例（用于需要直接访问 Store 的场景）
 */
export function createAnalyzer(
  entryPath: string,
  options: AnalysisOptionsInput = {}
): {
  store: DomainAnalysisStore;
  analyze: () => Promise<OutputType>;
} {
  // 合并默认选项
  const mergedOptions = {
    maxDepth: options.maxDepth ?? 10,
    excludePatterns: options.excludePatterns ?? [
      "node_modules",
      "dist",
      "__test__",
      "*.spec.ts",
      "*.test.ts",
    ],
    outputFormat: options.outputFormat ?? "full" as const,
    includeRelations: options.includeRelations ?? true,
    includeMethodDetails: options.includeMethodDetails ?? true,
  };

  const store = createDomainAnalysisStore(entryPath, mergedOptions);

  return {
    store,
    analyze: async () => analyzeDomainStructure(entryPath, options),
  };
}
