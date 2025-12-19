/**
 * 用户角色映射模块类型导出
 *
 * 供前端使用的类型定义
 */

// ========== Schema 类型 ==========
export type {
  UserRoleMapping,
  NewUserRoleMapping,
  UpdateUserRoleMapping,
} from './schema';

// ========== Zod Schema（前端可复用验证） ==========
export {
  insertUserRoleMappingSchema,
  updateUserRoleMappingSchema,
  selectUserRoleMappingSchema,
} from './schema';

// ========== Service 返回类型 ==========
export type {
  GetUserRolesResult,
  GetRoleUsersResult,
  GetMappingResult,
  AssignRoleResult,
  RevokeRoleResult,
} from './service';
