/**
 * 领域元素模式匹配器
 *
 * 通过命名约定、目录位置、继承关系识别领域元素类型
 */

import type { DomainElementType } from "../types";

// ============================================================================
// 模式配置
// ============================================================================

/**
 * 文件命名模式配置
 */
export const FILE_PATTERNS: Record<DomainElementType, RegExp[]> = {
  "bounded-context": [], // 上下文通过目录识别
  aggregate: [/\.aggregate\.ts$/, /Aggregate\.ts$/],
  entity: [/\.entity\.ts$/, /Entity\.ts$/],
  "value-object": [/\.vo\.ts$/, /\.value-object\.ts$/, /VO\.ts$/],
  "domain-event": [/\.event\.ts$/, /Event\.ts$/],
  "domain-service": [/\.service\.ts$/, /Service\.ts$/],
  "domain-state": [/\.state\.ts$/, /State\.ts$/],
  repository: [/\.repository\.interface\.ts$/, /Repository\.ts$/, /IRepository\.ts$/],
};

/**
 * 目录命名模式配置
 */
export const DIRECTORY_PATTERNS: Record<string, DomainElementType> = {
  aggregates: "aggregate",
  entities: "entity",
  "value-objects": "value-object",
  vo: "value-object",
  events: "domain-event",
  services: "domain-service",
  states: "domain-state",
  repositories: "repository",
};

/**
 * 类继承模式配置
 */
export const INHERITANCE_PATTERNS: Record<DomainElementType, string[]> = {
  "bounded-context": [],
  aggregate: ["AggregateRoot", "BaseAggregate", "Aggregate"],
  entity: ["Entity", "BaseEntity"],
  "value-object": ["ValueObject", "BaseValueObject", "BaseVO"],
  "domain-event": ["DomainEvent", "BaseEvent", "Event"],
  "domain-service": ["DomainService", "BaseService"],
  "domain-state": [],
  repository: [],
};

/**
 * 装饰器模式配置
 */
export const DECORATOR_PATTERNS: Record<DomainElementType, string[]> = {
  "bounded-context": [],
  aggregate: ["Aggregate", "AggregateRoot"],
  entity: ["Entity"],
  "value-object": ["ValueObject", "VO"],
  "domain-event": ["DomainEvent", "Event"],
  "domain-service": ["DomainService", "Service"],
  "domain-state": [],
  repository: ["Repository"],
};

// ============================================================================
// 匹配结果
// ============================================================================

/**
 * 匹配结果
 */
export interface PatternMatchResult {
  /** 匹配的元素类型 */
  type: DomainElementType;
  /** 置信度 (0-1) */
  confidence: number;
  /** 匹配方式 */
  matchedBy: ("naming" | "directory" | "inheritance" | "decorator")[];
}

// ============================================================================
// 匹配函数
// ============================================================================

/**
 * 通过文件名匹配元素类型
 */
export function matchByFileName(fileName: string): PatternMatchResult | null {
  for (const [type, patterns] of Object.entries(FILE_PATTERNS)) {
    for (const pattern of patterns) {
      if (pattern.test(fileName)) {
        return {
          type: type as DomainElementType,
          confidence: 0.8,
          matchedBy: ["naming"],
        };
      }
    }
  }
  return null;
}

/**
 * 通过目录名匹配元素类型
 */
export function matchByDirectory(dirName: string): DomainElementType | null {
  return DIRECTORY_PATTERNS[dirName] ?? null;
}

/**
 * 通过继承关系匹配元素类型
 */
export function matchByInheritance(
  extendsClass: string | undefined
): PatternMatchResult | null {
  if (!extendsClass) {
    return null;
  }

  for (const [type, patterns] of Object.entries(INHERITANCE_PATTERNS)) {
    if (patterns.includes(extendsClass)) {
      return {
        type: type as DomainElementType,
        confidence: 0.9,
        matchedBy: ["inheritance"],
      };
    }
  }
  return null;
}

/**
 * 通过装饰器匹配元素类型
 */
export function matchByDecorator(
  decorators: string[]
): PatternMatchResult | null {
  for (const [type, patterns] of Object.entries(DECORATOR_PATTERNS)) {
    for (const decorator of decorators) {
      if (patterns.includes(decorator)) {
        return {
          type: type as DomainElementType,
          confidence: 0.95,
          matchedBy: ["decorator"],
        };
      }
    }
  }
  return null;
}

/**
 * 综合匹配元素类型
 *
 * 结合多种方式提高识别准确性
 */
export function matchElementType(context: {
  fileName: string;
  dirName: string;
  extendsClass?: string;
  decorators: string[];
}): PatternMatchResult | null {
  const results: PatternMatchResult[] = [];

  // 按优先级收集匹配结果
  const decoratorMatch = matchByDecorator(context.decorators);
  if (decoratorMatch) {
    results.push(decoratorMatch);
  }

  const inheritanceMatch = matchByInheritance(context.extendsClass);
  if (inheritanceMatch) {
    results.push(inheritanceMatch);
  }

  const namingMatch = matchByFileName(context.fileName);
  if (namingMatch) {
    results.push(namingMatch);
  }

  const directoryType = matchByDirectory(context.dirName);
  if (directoryType) {
    results.push({
      type: directoryType,
      confidence: 0.7,
      matchedBy: ["directory"],
    });
  }

  // 无匹配
  if (results.length === 0) {
    return null;
  }

  // 合并相同类型的匹配结果
  const typeGroups = new Map<DomainElementType, PatternMatchResult[]>();

  for (const result of results) {
    const group = typeGroups.get(result.type) ?? [];
    group.push(result);
    typeGroups.set(result.type, group);
  }

  // 找到最佳匹配
  let bestMatch: PatternMatchResult | null = null;
  let bestScore = 0;

  for (const [type, group] of typeGroups) {
    // 计算综合分数（置信度累加 + 匹配方式数量加权）
    const totalConfidence = group.reduce((sum, r) => sum + r.confidence, 0);
    const matchMethods = new Set(group.flatMap((r) => r.matchedBy));
    const score = totalConfidence + matchMethods.size * 0.1;

    if (score > bestScore) {
      bestScore = score;
      bestMatch = {
        type,
        confidence: Math.min(totalConfidence, 1),
        matchedBy: Array.from(matchMethods) as PatternMatchResult["matchedBy"],
      };
    }
  }

  return bestMatch;
}

// ============================================================================
// 命名工具
// ============================================================================

/**
 * 从文件名提取元素名称
 *
 * @example
 * extractElementName("user.aggregate.ts") => "user"
 * extractElementName("email.vo.ts") => "email"
 */
export function extractElementName(fileName: string): string {
  // 移除扩展名
  let name = fileName.replace(/\.ts$/, "");

  // 移除常见后缀
  const suffixes = [
    ".aggregate",
    ".entity",
    ".vo",
    ".value-object",
    ".event",
    ".service",
    ".state",
    ".repository",
    ".repository.interface",
  ];

  for (const suffix of suffixes) {
    if (name.endsWith(suffix)) {
      name = name.slice(0, -suffix.length);
      break;
    }
  }

  return name;
}

/**
 * 转换为 PascalCase
 */
export function toPascalCase(str: string): string {
  return str
    .split(/[-_.]/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join("");
}

/**
 * 转换为 kebab-case
 */
export function toKebabCase(str: string): string {
  return str
    .replace(/([a-z])([A-Z])/g, "$1-$2")
    .replace(/[_\s]+/g, "-")
    .toLowerCase();
}
