/**
 * 命名转换工具函数
 *
 * 提供 kebab-case、camelCase、PascalCase 之间的转换
 */

/**
 * kebab-case 转 camelCase
 * @example "check-email-exists" → "checkEmailExists"
 */
export function kebabToCamel(str: string): string {
  return str.replace(/-([a-z])/g, (_, letter: string) => letter.toUpperCase());
}

/**
 * kebab-case 转 PascalCase
 * @example "check-email-exists" → "CheckEmailExists"
 */
export function kebabToPascal(str: string): string {
  const camel = kebabToCamel(str);
  return camel.charAt(0).toUpperCase() + camel.slice(1);
}

/**
 * 生成 Schema 变量名
 * @example ("check-email-exists", "Input") → "checkEmailExistsInputSchema"
 */
export function generateSchemaName(
  operationName: string,
  suffix: "Input" | "Output"
): string {
  return `${kebabToCamel(operationName)}${suffix}Schema`;
}

/**
 * 生成类型名
 * @example ("check-email-exists", "Input") → "CheckEmailExistsInput"
 */
export function generateTypeName(
  operationName: string,
  suffix: "Input" | "Output"
): string {
  return `${kebabToPascal(operationName)}${suffix}`;
}

/**
 * 从路径推断 modulePath
 * @example "/home/.../identity-access/application/dto/user" → "identity-access/application/dto/user"
 */
export function inferModulePath(basePath: string): string {
  // 尝试从 application 开始截取
  const appIndex = basePath.indexOf("/application/");
  if (appIndex !== -1) {
    // 找 application 前一级作为模块名
    const beforeApp = basePath.slice(0, appIndex);
    const moduleName = beforeApp.split("/").pop() ?? "";
    return moduleName + basePath.slice(appIndex);
  }

  // 回退：取最后几级路径
  const parts = basePath.split("/");
  return parts.slice(-4).join("/");
}
