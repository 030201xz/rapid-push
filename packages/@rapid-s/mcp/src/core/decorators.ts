import 'reflect-metadata';

/**
 * 工具类装饰器元数据 Key
 * 使用 Symbol.for 确保跨模块共享同一个 Symbol
 */
export const TOOL_METADATA_KEY = Symbol.for('skills-mcp:tool:metadata');

/** 工具类装饰器，用于标记可注入的工具类 */
export function Tool() {
  return function <T extends new (...args: unknown[]) => unknown>(
    target: T,
  ): T {
    Reflect.defineMetadata(TOOL_METADATA_KEY, true, target);
    return target;
  };
}

/** 检查类是否被 @Tool 装饰 */
export function isToolClass(target: unknown): boolean {
  if (typeof target !== 'function') return false;
  return Reflect.getMetadata(TOOL_METADATA_KEY, target) === true;
}
