/**
 * 命名工具函数
 */

/**
 * PascalCase 转 kebab-case
 */
export function toKebabCase(str: string): string {
  return str
    .replace(/([a-z])([A-Z])/g, "$1-$2")
    .replace(/[\s_]+/g, "-")
    .toLowerCase();
}

/**
 * PascalCase 转 camelCase
 */
export function toCamelCase(str: string): string {
  return str.charAt(0).toLowerCase() + str.slice(1);
}

/**
 * kebab-case 转 PascalCase
 */
export function toPascalCase(str: string): string {
  return str
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");
}

/**
 * 方法名转类名
 */
export function toClassName(methodName: string, suffix: string): string {
  const capitalizedMethod =
    methodName.charAt(0).toUpperCase() + methodName.slice(1);
  return `${capitalizedMethod}${suffix}`;
}
