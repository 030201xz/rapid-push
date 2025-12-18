/**
 * 用户模块类型导出
 *
 * 供前端使用的类型定义
 */

// ========== Schema 类型 ==========
export type { User, NewUser, UpdateUser } from './schema';

// ========== Zod Schema（前端可复用验证） ==========
export { insertUserSchema, updateUserSchema, selectUserSchema } from './schema';

// ========== Service 返回类型 ==========
export type {
  ListUsersResult,
  GetUserResult,
  CreateUserResult,
  UpdateUserResult,
  DeleteUserResult,
} from './service';
