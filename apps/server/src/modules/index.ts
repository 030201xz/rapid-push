/**
 * 模块聚合入口
 *
 * 按业务域分组，统一导出 AppRouter 类型
 */

import { router } from '../common/trpc';
import { coreRouter } from './core';
import { hotUpdateRouter } from './hot-update';

// ========== 根路由聚合 ==========
export const appRouter = router({
  core: coreRouter,
  hotUpdate: hotUpdateRouter,
});

// ========== 类型导出 ==========

/** AppRouter 类型（tRPC 客户端使用） */
export type AppRouter = typeof appRouter;

// ========== 重导出各域类型命名空间 ==========
export {
  PermissionsTypes,
  RolePermissionMappingsTypes,
  RolesTypes,
  UserRoleMappingsTypes,
  UsersTypes,
} from './core';

export {
  AssetsTypes,
  ChannelsTypes,
  DirectivesTypes,
  OrganizationMembersTypes,
  OrganizationsTypes,
  ProjectsTypes,
  RolloutRulesTypes,
  UpdateAssetsTypes,
  UpdatesTypes,
} from './hot-update';
