/**
 * 模块聚合入口
 *
 * 所有模块路由在此注册，统一导出 AppRouter 类型
 */

import { router } from '../common/trpc';
import { usersRouter } from './users/router';
import { rolesRouter } from './roles/router';
import { permissionsRouter } from './permissions/router';
import { userRoleMappingsRouter } from './user-role-mappings/router';
import { rolePermissionMappingsRouter } from './role-permission-mappings/router';

// ========== 模块聚合 ==========
export const appRouter = router({
  users: usersRouter,
  roles: rolesRouter,
  permissions: permissionsRouter,
  userRoleMappings: userRoleMappingsRouter,
  rolePermissionMappings: rolePermissionMappingsRouter,
});

// ========== 类型导出 ==========

/** AppRouter 类型（tRPC 客户端使用） */
export type AppRouter = typeof appRouter;

/** 模块类型导出 */
export * as UsersTypes from './users/types';
export * as RolesTypes from './roles/types';
export * as PermissionsTypes from './permissions/types';
export * as UserRoleMappingsTypes from './user-role-mappings/types';
export * as RolePermissionMappingsTypes from './role-permission-mappings/types';
