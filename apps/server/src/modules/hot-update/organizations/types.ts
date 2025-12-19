/**
 * 组织模块类型导出
 *
 * 供前端使用的类型定义
 */

// ========== Schema 类型 ==========
export type {
  NewOrganization,
  Organization,
  UpdateOrganization,
} from './schema';

// ========== Zod Schema（前端可复用验证） ==========
export {
  insertOrganizationSchema,
  selectOrganizationSchema,
  updateOrganizationSchema,
} from './schema';

// ========== Service 返回类型 ==========
export type {
  CreateOrganizationResult,
  DeleteOrganizationResult,
  GetOrganizationResult,
  ListOrganizationsResult,
  UpdateOrganizationResult,
} from './service';
