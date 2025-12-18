/**
 * 仓储接口解析器
 *
 * 解析 *.repository.interface.ts 文件，提取仓储接口信息
 */

import type { Repository, RepositoryMethod } from "../types";
import {
  parseFile,
  getJsDocDescription,
  extractInterfaceMethods,
  getExtendsInterfaces,
} from "../ast";

/**
 * 解析仓储接口文件
 *
 * @param filePath 仓储接口文件路径
 * @param contextId 所属限界上下文 ID
 * @returns 仓储接口信息（如果解析成功）
 */
export function parseRepository(
  filePath: string,
  contextId: string
): Repository | null {
  const sourceFile = parseFile(filePath);

  // 查找接口声明
  const interfaces = sourceFile.getInterfaces();

  // 优先查找以 Repository 结尾或以 I 开头的仓储接口
  let repoInterface: ReturnType<typeof sourceFile.getInterfaces>[0] | undefined;

  for (const iface of interfaces) {
    const name = iface.getName();
    if (
      name?.endsWith("Repository") ||
      name?.startsWith("I") && name?.includes("Repository")
    ) {
      repoInterface = iface;
      break;
    }
  }

  // 如果没找到，取第一个导出的接口
  if (!repoInterface) {
    for (const iface of interfaces) {
      if (iface.isExported()) {
        repoInterface = iface;
        break;
      }
    }
  }

  if (!repoInterface) {
    return null;
  }

  const interfaceName = repoInterface.getName() ?? "UnknownRepository";

  // 推断聚合类型
  const aggregateType = inferAggregateType(interfaceName, repoInterface);

  // 提取仓储名称
  const repoName = interfaceName
    .replace(/^I/, "")
    .replace(/Repository$/, "");

  // 生成唯一 ID
  const id = `repository:${contextId}:${repoName.toLowerCase()}`;

  // 生成关联的聚合 ID
  const aggregateId = `aggregate:${contextId}:${aggregateType.toLowerCase()}`;

  // 提取方法并分类
  const rawMethods = extractInterfaceMethods(repoInterface);
  const methods: RepositoryMethod[] = rawMethods.map((method) => ({
    ...method,
    operationType: classifyRepositoryMethod(method.name),
  }));

  // 提取继承的接口
  const extendsInterfaces = getExtendsInterfaces(repoInterface);

  // 提取 JSDoc 描述
  const description = getJsDocDescription(repoInterface);

  return {
    id,
    name: repoName,
    interfaceName,
    contextId,
    aggregateId,
    aggregateType,
    filePath,
    methods,
    extendsInterfaces,
    decorators: [],
    description,
    lineNumber: repoInterface.getStartLineNumber(),
  };
}

/**
 * 从接口名称或泛型参数推断聚合类型
 */
function inferAggregateType(
  interfaceName: string,
  repoInterface: ReturnType<ReturnType<typeof parseFile>["getInterfaces"]>[0]
): string {
  // 尝试从接口名推断：IUserRepository -> User
  let aggregateName = interfaceName
    .replace(/^I/, "")
    .replace(/Repository$/, "");

  // 尝试从继承的泛型参数推断
  const extendsClause = repoInterface.getExtends();
  for (const ext of extendsClause) {
    const typeArgs = ext.getTypeArguments();
    if (typeArgs.length > 0) {
      const firstArg = typeArgs[0].getText();
      // 移除泛型和导入路径
      aggregateName = firstArg.replace(/[<>]/g, "").split(".").pop() ?? aggregateName;
      break;
    }
  }

  return aggregateName;
}

/**
 * 分类仓储方法为查询或命令
 */
function classifyRepositoryMethod(
  methodName: string
): RepositoryMethod["operationType"] {
  // 查询方法模式
  const queryPatterns = [
    /^find/,
    /^get/,
    /^fetch/,
    /^load/,
    /^query/,
    /^search/,
    /^list/,
    /^count/,
    /^exists/,
    /^has/,
    /^is/,
    /^check/,
  ];

  // 命令方法模式
  const commandPatterns = [
    /^save/,
    /^create/,
    /^insert/,
    /^add/,
    /^update/,
    /^delete/,
    /^remove/,
    /^persist/,
    /^store/,
  ];

  for (const pattern of queryPatterns) {
    if (pattern.test(methodName)) {
      return "query";
    }
  }

  for (const pattern of commandPatterns) {
    if (pattern.test(methodName)) {
      return "command";
    }
  }

  return "unknown";
}
