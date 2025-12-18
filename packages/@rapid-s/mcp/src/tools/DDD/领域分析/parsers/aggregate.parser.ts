/**
 * 聚合根解析器
 *
 * 解析 *.aggregate.ts 文件，提取聚合根信息
 */

import * as path from "node:path";
import type { AggregateRoot } from "../types";
import {
  parseFile,
  getJsDocDescription,
  extractClassProperties,
  extractClassMethods,
  getExtendsClass,
  getImplementsInterfaces,
  extractDecorators,
  toPascalCase,
} from "../ast";

/**
 * 解析聚合根文件
 *
 * @param filePath 聚合根文件路径
 * @param contextId 所属限界上下文 ID
 * @returns 聚合根信息（如果解析成功）
 */
export function parseAggregate(
  filePath: string,
  contextId: string
): AggregateRoot | null {
  const sourceFile = parseFile(filePath);

  // 查找类声明（通常聚合根是一个类）
  const classes = sourceFile.getClasses();

  // 优先查找以 Aggregate 结尾的类
  let aggregateClass = classes.find((cls) =>
    cls.getName()?.endsWith("Aggregate")
  );

  // 如果没找到，取第一个导出的类
  if (!aggregateClass) {
    aggregateClass = classes.find((cls) => cls.isExported());
  }

  if (!aggregateClass) {
    return null;
  }

  const className = aggregateClass.getName() ?? "UnknownAggregate";
  const fileName = path.basename(filePath);

  // 提取聚合名称（移除 Aggregate 后缀）
  const aggregateName = className.replace(/Aggregate$/, "");

  // 生成唯一 ID
  const id = `aggregate:${contextId}:${aggregateName.toLowerCase()}`;

  // 提取属性
  const properties = extractClassProperties(aggregateClass);

  // 提取方法
  const methods = extractClassMethods(aggregateClass);

  // 提取装饰器
  const decorators = extractDecorators(aggregateClass);

  // 提取继承关系
  const extendsClass = getExtendsClass(aggregateClass);
  const implementsInterfaces = getImplementsInterfaces(aggregateClass);

  // 提取 JSDoc 描述
  const description = getJsDocDescription(aggregateClass);

  // 分析使用的值对象（通过属性类型推断）
  const valueObjectIds = extractValueObjectIds(properties, contextId);

  // 分析发布的事件（通过方法名或类型推断）
  const eventIds = extractEventIds(methods, contextId);

  return {
    id,
    name: aggregateName,
    className,
    contextId,
    filePath,
    properties,
    methods,
    extendsClass,
    implementsInterfaces,
    decorators,
    description,
    lineNumber: aggregateClass.getStartLineNumber(),
    entityIds: [], // 需要后续关联分析
    valueObjectIds,
    eventIds,
    repositoryId: undefined, // 需要后续关联分析
  };
}

/**
 * 从属性类型推断使用的值对象 ID
 */
function extractValueObjectIds(
  properties: AggregateRoot["properties"],
  contextId: string
): string[] {
  const voIds: string[] = [];

  // 常见值对象后缀
  const voSuffixes = ["Id", "VO", "Email", "Phone", "Password", "Username", "Status"];

  for (const prop of properties) {
    const typeName = prop.type.replace(/[<>\[\]]/g, ""); // 移除泛型和数组标记

    // 检查是否可能是值对象
    for (const suffix of voSuffixes) {
      if (typeName.endsWith(suffix) && typeName !== suffix) {
        const voName = typeName;
        voIds.push(`value-object:${contextId}:${voName.toLowerCase()}`);
        break;
      }
    }
  }

  return [...new Set(voIds)]; // 去重
}

/**
 * 从方法推断发布的事件 ID
 */
function extractEventIds(
  methods: AggregateRoot["methods"],
  contextId: string
): string[] {
  const eventIds: string[] = [];

  // 常见事件触发方法名模式
  const eventMethodPatterns = [/^emit/, /^publish/, /^raise/, /^dispatch/];
  const eventTypeSuffixes = ["Event", "Created", "Updated", "Deleted"];

  for (const method of methods) {
    // 检查方法名是否是事件触发方法
    for (const pattern of eventMethodPatterns) {
      if (pattern.test(method.name)) {
        // 从参数类型推断事件类型
        for (const param of method.parameters) {
          const typeName = param.type.replace(/[<>\[\]]/g, "");
          if (eventTypeSuffixes.some((suffix) => typeName.endsWith(suffix))) {
            eventIds.push(`event:${contextId}:${typeName.toLowerCase()}`);
          }
        }
      }
    }

    // 检查返回类型是否包含事件
    for (const suffix of eventTypeSuffixes) {
      if (method.returnType.includes(suffix)) {
        const match = method.returnType.match(/(\w+Event)/);
        if (match) {
          eventIds.push(`event:${contextId}:${match[1].toLowerCase()}`);
        }
      }
    }
  }

  return [...new Set(eventIds)]; // 去重
}
