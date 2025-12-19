/**
 * 权限模块类型导出
 *
 * 供前端使用的类型定义
 */

// ========== Schema 类型 ==========
export type { Permission, NewPermission, UpdatePermission, PermissionType } from './schema';

// ========== 常量导出 ==========
export { PERMISSION_TYPE } from './schema';

// ========== Zod Schema（前端可复用验证） ==========
export {
  insertPermissionSchema,
  updatePermissionSchema,
  selectPermissionSchema,
} from './schema';

// ========== Service 返回类型 ==========
export type {
  ListPermissionsResult,
  GetPermissionResult,
  CreatePermissionResult,
  UpdatePermissionResult,
  DeletePermissionResult,
} from './service';
