/**
 * 角色模块类型导出
 *
 * 供前端使用的类型定义
 */

// ========== Schema 类型 ==========
export type { NewRole, Role, UpdateRole } from './schema';

// ========== Zod Schema（前端可复用验证） ==========
export {
  insertRoleSchema,
  selectRoleSchema,
  updateRoleSchema,
} from './schema';

// ========== Service 返回类型 ==========
export type {
  CreateRoleResult,
  DeleteRoleResult,
  GetRoleResult,
  ListRolesResult,
  UpdateRoleResult,
} from './service';
