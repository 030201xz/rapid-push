import { router } from '../common/trpc';
import { usersRouter } from './users/router';

// ========== 模块聚合 ==========
// 新增模块只需在此注册
export const appRouter = router({
  users: usersRouter,
  // posts: postsRouter,
  // orders: ordersRouter,
});

// ========== 类型导出 ==========

/** AppRouter 类型（tRPC 客户端使用） */
export type AppRouter = typeof appRouter;

/** 用户模块类型 */
export * as UsersTypes from './users/types';
// export * as PostsTypes from './posts/types';
// export * as OrdersTypes from './orders/types';
