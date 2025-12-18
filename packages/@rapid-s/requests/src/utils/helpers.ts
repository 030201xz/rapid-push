/**
 * 通用工具函数
 */

/**
 * 合并多个对象,后面的覆盖前面的
 */
export function mergeConfig<T extends Record<string, unknown>>(
  ...configs: (T | undefined)[]
): T {
  const result = {} as T;
  for (const config of configs) {
    if (config) {
      Object.assign(result, config);
    }
  }
  return result;
}

/**
 * 深度合并对象
 */
export function deepMerge<T extends Record<string, unknown>>(
  target: T,
  ...sources: (Partial<T> | undefined)[]
): T {
  const result = { ...target };

  for (const source of sources) {
    if (!source) continue;

    for (const key in source) {
      const sourceValue = source[key];
      const targetValue = result[key];

      if (isPlainObject(sourceValue) && isPlainObject(targetValue)) {
        result[key] = deepMerge(
          targetValue as Record<string, unknown>,
          sourceValue as Record<string, unknown>
        ) as T[Extract<keyof T, string>];
      } else if (sourceValue !== undefined) {
        result[key] = sourceValue as T[Extract<keyof T, string>];
      }
    }
  }

  return result;
}

/**
 * 判断是否为纯对象
 */
function isPlainObject(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    Object.prototype.toString.call(value) === "[object Object]"
  );
}

/**
 * 延迟函数
 */
export async function delay(ms: number): Promise<void> {
  await new Promise<void>((resolve) => {
    globalThis.setTimeout(resolve, ms);
  });
}

/**
 * 计算重试延迟 (支持指数退避)
 */
export function calculateRetryDelay(
  attempt: number,
  baseDelay: number,
  exponential: boolean
): number {
  if (!exponential) return baseDelay;
  
  // 指数退避: baseDelay * 2^(attempt - 1)
  // 例如: 1000ms, 2000ms, 4000ms, 8000ms...
  return baseDelay * Math.pow(2, attempt - 1);
}
