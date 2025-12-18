/**
 * 端到端类型安全导出入口
 *
 * 前端通过此文件获取所有类型定义
 *
 * @example
 * ```typescript
 * // 前端使用
 * import type { AppRouter, RouterInput, RouterOutput } from '@rapid-s/server/types';
 * import { UsersTypes } from '@rapid-s/server/types';
 *
 * // tRPC 客户端
 * const client = createTRPCClient<AppRouter>({ ... });
 *
 * // 类型推断
 * type CreateUserInput = RouterInput['users']['create'];
 * type UserListOutput = RouterOutput['users']['list'];
 *
 * // 使用 Zod Schema（前端表单验证）
 * const { insertUserSchema } = UsersTypes;
 * ```
 */

// ========== tRPC Router 类型 ==========
export type { AppRouter } from './modules';

// ========== Router Input/Output 推断类型 ==========
export type { RouterInput, RouterOutput } from './types/router';

// ========== 模块类型命名空间 ==========
export { UsersTypes } from './modules';
// export { PostsTypes } from './modules';
// export { OrdersTypes } from './modules';
