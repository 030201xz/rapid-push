/**
 * 领域服务解析器
 *
 * 解析 *.service.ts 文件，提取领域服务信息
 */

import type { DomainService } from "../types";
import {
  parseFile,
  getJsDocDescription,
  extractClassMethods,
  getExtendsClass,
  getImplementsInterfaces,
  extractDecorators,
  extractConstructorDependencies,
} from "../ast";

/**
 * 解析领域服务文件
 *
 * @param filePath 服务文件路径
 * @param contextId 所属限界上下文 ID
 * @returns 领域服务信息（如果解析成功）
 */
export function parseDomainService(
  filePath: string,
  contextId: string
): DomainService | null {
  const sourceFile = parseFile(filePath);

  // 查找类声明
  const classes = sourceFile.getClasses();

  // 优先查找以 Service 结尾的类
  let serviceClass: ReturnType<typeof sourceFile.getClasses>[0] | undefined;

  for (const cls of classes) {
    if (cls.getName()?.endsWith("Service")) {
      serviceClass = cls;
      break;
    }
  }

  // 如果没找到，取第一个导出的类
  if (!serviceClass) {
    for (const cls of classes) {
      if (cls.isExported()) {
        serviceClass = cls;
        break;
      }
    }
  }

  if (!serviceClass) {
    return null;
  }

  const className = serviceClass.getName() ?? "UnknownService";

  // 提取服务名称（移除 Service 后缀）
  const serviceName = className.replace(/Service$/, "");

  // 生成唯一 ID
  const id = `service:${contextId}:${className.toLowerCase()}`;

  // 提取方法
  const methods = extractClassMethods(serviceClass);

  // 提取依赖注入（构造函数参数）
  const dependencies = extractConstructorDependencies(serviceClass);

  // 提取装饰器
  const decorators = extractDecorators(serviceClass);

  // 提取继承关系
  const extendsClass = getExtendsClass(serviceClass);
  const implementsInterfaces = getImplementsInterfaces(serviceClass);

  // 提取 JSDoc 描述
  const description = getJsDocDescription(serviceClass);

  return {
    id,
    name: serviceName,
    className,
    contextId,
    filePath,
    methods,
    dependencies,
    extendsClass,
    implementsInterfaces,
    decorators,
    description,
    lineNumber: serviceClass.getStartLineNumber(),
  };
}
