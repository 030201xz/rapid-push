/**
 * 模块聚合入口
 *
 * 按业务域分组，统一导出 AppRouter 类型
 */

import { router } from '../common/trpc';
import { coreRouter } from './core';
// import { businessRouter } from './business';
// import { systemRouter } from './system';

// ========== 根路由聚合 ==========
export const appRouter = router({
  core: coreRouter,
  // business: businessRouter,
  // system: systemRouter,
});

// ========== 类型导出 ==========

/** AppRouter 类型（tRPC 客户端使用） */
export type AppRouter = typeof appRouter;

// ========== 重导出各域类型命名空间 ==========
export {
  UsersTypes,
  RolesTypes,
  PermissionsTypes,
  UserRoleMappingsTypes,
  RolePermissionMappingsTypes,
} from './core';
