/**
 * Router 类型推导
 * 从 AppRouter 自动推导所有路由的 Input/Output 类型
 */

import type { inferRouterInputs, inferRouterOutputs } from '@trpc/server';
import type { AppRouter } from '../modules';

// ========== 路由类型推导 ==========

/** 所有路由的 Input 类型 */
export type RouterInput = inferRouterInputs<AppRouter>;

/** 所有路由的 Output 类型 */
export type RouterOutput = inferRouterOutputs<AppRouter>;

/**
 * 使用示例：
 * type CreateUserInput = RouterInput['users']['create'];
 * type UserListOutput = RouterOutput['users']['list'];
 */
