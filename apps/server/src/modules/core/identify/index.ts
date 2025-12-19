/**
 * Identify 子域聚合入口
 *
 * 包含用户身份相关模块：users、auth
 */

import { router } from '../../../common/trpc';
import { usersRouter } from './users/router';

// ========== Identify 子域路由聚合 ==========
export const identifyRouter = router({
  users: usersRouter,
  // auth: authRouter, // TODO: 添加 auth 模块后取消注释
});

// ========== 类型命名空间导出 ==========
export * as UsersTypes from './users/types';
// export * as AuthTypes from './auth/types';
