/**
 * Identify 子域聚合入口
 *
 * 包含用户身份相关模块：users、auth
 */

import { router } from '../../../common/trpc';
import { authRouter } from './auth/router';
import { usersRouter } from './users/router';

// ========== Identify 子域路由聚合 ==========
export const identifyRouter = router({
  users: usersRouter,
  auth: authRouter,
});

// ========== 类型命名空间导出 ==========
export * as AuthTypes from './auth/types';
export * as UsersTypes from './users/types';
