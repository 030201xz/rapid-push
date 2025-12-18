/**
 * rapid-s 事务管理
 *
 * 设计原则：
 * - AsyncLocalStorage 实现隐式事务传递
 * - 支持嵌套调用，自动感知事务上下文
 * - 简洁 API，零心智负担
 */

import { AsyncLocalStorage } from 'node:async_hooks';

import type {
  RapidSDbContext,
  RapidSDatabase,
  RapidSTransactionClient,
} from './types';

// ============================================================================
// 事务上下文存储
// ============================================================================

/** 事务上下文存储（用于在调用链中传递事务客户端） */
const transactionStorage = new AsyncLocalStorage<RapidSTransactionClient>();

// ============================================================================
// 事务上下文 API
// ============================================================================

/**
 * 获取当前事务客户端
 *
 * @returns 当前事务客户端，不在事务中返回 undefined
 */
export function getCurrentTransaction(): RapidSTransactionClient | undefined {
  return transactionStorage.getStore();
}

/**
 * 获取数据库执行上下文
 *
 * 优先返回当前事务客户端，否则返回传入的数据库实例
 * 这是 Service 中推荐的使用方式
 *
 * @param db - 默认数据库实例
 * @returns 当前事务客户端或数据库实例
 *
 * @example
 * ```ts
 * // 在 Service 中统一使用
 * async function createUser(db: RapidSDatabase, data: NewUser) {
 *   const ctx = getDbContext(db);
 *   return ctx.insert(users).values(data).returning();
 * }
 *
 * // 事务中自动使用事务客户端
 * await withTransaction(db, async () => {
 *   await createUser(db, { name: 'Alice' }); // 自动使用事务
 *   await createLog(db, { action: 'user_created' }); // 同一事务
 * });
 * ```
 */
export function getDbContext(db: RapidSDatabase): RapidSDbContext {
  return getCurrentTransaction() ?? db;
}

/**
 * 在事务上下文中执行函数
 *
 * 内部使用，将事务客户端存储到 AsyncLocalStorage
 *
 * @param tx - 事务客户端
 * @param fn - 要执行的函数
 * @returns 函数返回值
 */
export function runInTransaction<T>(
  tx: RapidSTransactionClient,
  fn: () => T | Promise<T>,
): T | Promise<T> {
  return transactionStorage.run(tx, fn);
}

// ============================================================================
// 事务包装器
// ============================================================================

/**
 * 执行事务（支持 AsyncLocalStorage 上下文传递）
 *
 * @param db - 数据库实例
 * @param fn - 事务回调
 * @returns 事务执行结果
 *
 * @example
 * ```ts
 * const result = await withTransaction(db, async () => {
 *   // 在同一事务中执行多个操作
 *   await createUser(db, { name: 'Alice' });
 *   await createLog(db, { action: 'user_created' });
 *   return 'success';
 * });
 * ```
 */
export async function withTransaction<T>(
  db: RapidSDatabase,
  fn: () => Promise<T>,
): Promise<T> {
  return db.transaction(async (tx) => {
    return runInTransaction(tx, fn) as Promise<T>;
  });
}

/**
 * 创建事务包装器（柯里化版本）
 *
 * @param db - 数据库实例
 * @returns 事务包装函数
 *
 * @example
 * ```ts
 * const runTx = createTransactionWrapper(db);
 *
 * await runTx(async () => {
 *   await createUser(db, { name: 'Alice' });
 *   await createLog(db, { action: 'user_created' });
 * });
 * ```
 */
export function createTransactionWrapper(db: RapidSDatabase) {
  return <T>(fn: () => Promise<T>): Promise<T> => {
    return withTransaction(db, fn);
  };
}
