/**
 * Domain Scaffold Generator - 命名工具
 *
 * 提供各种命名转换函数
 */

/**
 * kebab-case 转 PascalCase
 * @example "wallet-account" -> "WalletAccount"
 */
export function kebabToPascal(kebab: string): string {
  return kebab
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");
}

/**
 * kebab-case 转 camelCase
 * @example "wallet-account" -> "walletAccount"
 */
export function kebabToCamel(kebab: string): string {
  const pascal = kebabToPascal(kebab);
  return pascal.charAt(0).toLowerCase() + pascal.slice(1);
}

/**
 * 从文件名提取类名
 * @example "wallet-account.aggregate.ts" -> "WalletAccountAggregate"
 * @example "balance.vo.ts" -> "Balance"
 * @example "wallet-account.repository.interface.ts" -> "IWalletAccountRepository"
 */
export function extractClassName(filename: string): string {
  // 移除 .ts 扩展名
  const withoutExt = filename.replace(/\.ts$/, "");

  // 解析文件名模式
  const parts = withoutExt.split(".");

  if (parts.length === 1) {
    // 简单文件名，如 "balance"
    return kebabToPascal(parts[0]);
  }

  const baseName = parts[0];
  const suffix = parts.slice(1).join(".");

  // 根据后缀推断类名格式
  switch (suffix) {
    case "aggregate":
      return `${kebabToPascal(baseName)}Aggregate`;
    case "entity":
      return `${kebabToPascal(baseName)}Entity`;
    case "vo":
      return kebabToPascal(baseName);
    case "state":
      return `${kebabToPascal(baseName)}State`;
    case "state.interface":
      return `I${kebabToPascal(baseName)}State`;
    case "state.factory":
      return `${kebabToPascal(baseName)}StateFactory`;
    case "events":
      return `${kebabToPascal(baseName)}Events`;
    case "events.type-safety":
      return `${kebabToPascal(baseName)}EventsTypeSafety`;
    case "repository.interface":
      return `I${kebabToPascal(baseName)}Repository`;
    case "service":
      return `${kebabToPascal(baseName)}Service`;
    case "errors":
      return `${kebabToPascal(baseName)}Errors`;
    default:
      return kebabToPascal(baseName);
  }
}

/**
 * 从文件名提取简短描述
 * @example "wallet-account.aggregate.ts" -> "WalletAccount 聚合根"
 */
export function extractDescription(
  filename: string,
  type: string
): string {
  const withoutExt = filename.replace(/\.ts$/, "");
  const parts = withoutExt.split(".");
  const baseName = kebabToPascal(parts[0]);

  const typeDescriptions: Record<string, string> = {
    aggregate: "聚合根",
    entity: "实体",
    "value-object": "值对象",
    state: "状态",
    event: "事件",
    repository: "仓储接口",
    service: "领域服务",
    exception: "异常",
    index: "索引",
  };

  return `${baseName} ${typeDescriptions[type] || type}`;
}
