/**
 * Access Control 子域聚合入口
 *
 * 包含 RBAC 相关模块：roles、permissions、mappings
 */

import { router } from '../../../common/trpc';
import { permissionsRouter } from './permissions/router';
import { rolePermissionMappingsRouter } from './role-permission-mappings/router';
import { rolesRouter } from './roles/router';
import { userRoleMappingsRouter } from './user-role-mappings/router';

// ========== Access Control 子域路由聚合 ==========
export const accessControlRouter = router({
  roles: rolesRouter,
  permissions: permissionsRouter,
  userRoleMappings: userRoleMappingsRouter,
  rolePermissionMappings: rolePermissionMappingsRouter,
});

// ========== 类型命名空间导出 ==========
export * as PermissionsTypes from './permissions/types';
export * as RolePermissionMappingsTypes from './role-permission-mappings/types';
export * as RolesTypes from './roles/types';
export * as UserRoleMappingsTypes from './user-role-mappings/types';
