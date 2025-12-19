/**
 * 更新模块类型导出
 *
 * 供前端使用的类型定义
 */

// ========== Schema 类型 ==========
export type { NewUpdate, Update, UpdateSettings } from './schema';

// ========== Zod Schema（前端可复用验证） ==========
export {
  insertUpdateSchema,
  selectUpdateSchema,
  updateSettingsSchema,
} from './schema';

// ========== Service 返回类型 ==========
export type {
  CreateUpdateResult,
  DeleteUpdateResult,
  GetUpdateResult,
  ListUpdatesResult,
  UpdateSettingsResult,
} from './service';
