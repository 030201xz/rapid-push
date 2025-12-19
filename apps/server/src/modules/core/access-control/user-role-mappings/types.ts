/**
 * 用户角色映射模块类型导出
 *
 * 供前端使用的类型定义
 */

// ========== Schema 类型 ==========
export type {
  NewUserRoleMapping,
  UpdateUserRoleMapping,
  UserRoleMapping,
} from './schema';

// ========== Zod Schema（前端可复用验证） ==========
export {
  insertUserRoleMappingSchema,
  selectUserRoleMappingSchema,
  updateUserRoleMappingSchema,
} from './schema';

// ========== Service 返回类型 ==========
export type {
  AssignOrgRoleResult,
  AssignRoleResult,
  GetMappingResult,
  GetRoleUsersResult,
  GetUserOrgRolesResult,
  GetUserRolesResult,
  ListOrgMembersResult,
  ListUserOrganizationsResult,
  RevokeRoleResult,
} from './service';

// ========== Constants（前端可用） ==========
export {
  ORG_ADMIN_ROLES,
  ORG_ROLE_CODE,
  SCOPE_TYPE,
  type OrgRoleCode,
  type ScopeType,
} from '../constants';
