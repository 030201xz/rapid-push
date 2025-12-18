import { router } from '../common/trpc';
import { usersRouter } from './users/router';

// ========== 模块聚合 ==========
// 新增模块只需在此注册
export const appRouter = router({
  users: usersRouter,
  // posts: postsRouter,
  // orders: ordersRouter,
});

// 导出类型供客户端使用
export type AppRouter = typeof appRouter;
