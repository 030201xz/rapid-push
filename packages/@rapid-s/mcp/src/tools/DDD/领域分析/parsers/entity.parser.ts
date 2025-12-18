/**
 * 实体解析器
 *
 * 解析 *.entity.ts 文件，提取实体信息
 */

import * as path from "node:path";
import type { Entity } from "../types";
import {
  parseFile,
  getJsDocDescription,
  extractClassProperties,
  extractClassMethods,
  getExtendsClass,
  getImplementsInterfaces,
  extractDecorators,
} from "../ast";

/**
 * 解析实体文件
 *
 * @param filePath 实体文件路径
 * @param contextId 所属限界上下文 ID
 * @returns 实体信息（如果解析成功）
 */
export function parseEntity(
  filePath: string,
  contextId: string
): Entity | null {
  const sourceFile = parseFile(filePath);

  // 查找类声明
  const classes = sourceFile.getClasses();

  // 优先查找以 Entity 结尾的类
  let entityClass = classes.find((cls) => cls.getName()?.endsWith("Entity"));

  // 如果没找到，取第一个导出的类
  if (!entityClass) {
    entityClass = classes.find((cls) => cls.isExported());
  }

  if (!entityClass) {
    return null;
  }

  const className = entityClass.getName() ?? "UnknownEntity";

  // 提取实体名称（移除 Entity 后缀）
  const entityName = className.replace(/Entity$/, "");

  // 生成唯一 ID
  const id = `entity:${contextId}:${entityName.toLowerCase()}`;

  // 提取属性
  const properties = extractClassProperties(entityClass);

  // 提取方法
  const methods = extractClassMethods(entityClass);

  // 提取装饰器
  const decorators = extractDecorators(entityClass);

  // 提取继承关系
  const extendsClass = getExtendsClass(entityClass);
  const implementsInterfaces = getImplementsInterfaces(entityClass);

  // 提取 JSDoc 描述
  const description = getJsDocDescription(entityClass);

  return {
    id,
    name: entityName,
    className,
    contextId,
    filePath,
    properties,
    methods,
    extendsClass,
    implementsInterfaces,
    decorators,
    description,
    lineNumber: entityClass.getStartLineNumber(),
    aggregateId: undefined, // 需要后续关联分析
  };
}
