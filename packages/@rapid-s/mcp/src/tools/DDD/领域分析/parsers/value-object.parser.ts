/**
 * 值对象解析器
 *
 * 解析 *.vo.ts 或 *.value-object.ts 文件，提取值对象信息
 */

import * as path from "node:path";
import type { ValueObject } from "../types";
import {
  parseFile,
  getJsDocDescription,
  extractClassProperties,
  extractClassMethods,
  getExtendsClass,
  extractDecorators,
} from "../ast";

/**
 * 解析值对象文件
 *
 * @param filePath 值对象文件路径
 * @param contextId 所属限界上下文 ID
 * @returns 值对象信息（如果解析成功）
 */
export function parseValueObject(
  filePath: string,
  contextId: string
): ValueObject | null {
  const sourceFile = parseFile(filePath);

  // 查找类声明
  const classes = sourceFile.getClasses();

  // 优先查找以 VO 或值对象相关命名结尾的类
  let voClass = classes.find(
    (cls) =>
      cls.getName()?.endsWith("VO") ||
      cls.getName()?.endsWith("ValueObject") ||
      cls.getName()?.endsWith("Id")
  );

  // 如果没找到，取第一个导出的类
  if (!voClass) {
    voClass = classes.find((cls) => cls.isExported());
  }

  if (!voClass) {
    return null;
  }

  const className = voClass.getName() ?? "UnknownVO";

  // 提取值对象名称
  let voName = className;
  const suffixes = ["VO", "ValueObject"];
  for (const suffix of suffixes) {
    if (voName.endsWith(suffix)) {
      voName = voName.slice(0, -suffix.length);
      break;
    }
  }

  // 生成唯一 ID
  const id = `value-object:${contextId}:${className.toLowerCase()}`;

  // 提取属性
  const properties = extractClassProperties(voClass);

  // 提取方法
  const methods = extractClassMethods(voClass);

  // 提取装饰器
  const decorators = extractDecorators(voClass);

  // 提取继承关系
  const extendsClass = getExtendsClass(voClass);

  // 提取 JSDoc 描述
  const description = getJsDocDescription(voClass);

  // 判断是否不可变（所有属性都是 readonly）
  const isImmutable =
    properties.length > 0 && properties.every((p) => p.isReadonly);

  // 提取验证规则（从方法名和 JSDoc 推断）
  const validationRules = extractValidationRules(methods, description);

  return {
    id,
    name: voName,
    className,
    contextId,
    filePath,
    properties,
    methods,
    extendsClass,
    decorators,
    description,
    lineNumber: voClass.getStartLineNumber(),
    isImmutable,
    validationRules,
    aggregateId: undefined, // 需要后续关联分析
  };
}

/**
 * 从方法和描述中提取验证规则
 */
function extractValidationRules(
  methods: ValueObject["methods"],
  description?: string
): string[] {
  const rules: string[] = [];

  // 从方法名推断验证规则
  const validationMethods = methods.filter(
    (m) =>
      m.name.startsWith("validate") ||
      m.name.startsWith("check") ||
      m.name.startsWith("is") ||
      m.name === "create" ||
      m.name === "of"
  );

  for (const method of validationMethods) {
    if (method.description) {
      rules.push(method.description);
    } else if (method.name.startsWith("validate")) {
      rules.push(`${method.name.replace("validate", "")} validation`);
    }
  }

  // 从 JSDoc 描述中提取验证相关信息
  if (description) {
    // 查找常见的验证描述模式
    const patterns = [
      /必须(.+)/g,
      /不能(.+)/g,
      /至少(.+)/g,
      /最多(.+)/g,
      /格式[：:]\s*(.+)/g,
      /范围[：:]\s*(.+)/g,
    ];

    for (const pattern of patterns) {
      const matches = description.matchAll(pattern);
      for (const match of matches) {
        rules.push(match[0].trim());
      }
    }
  }

  return rules;
}
