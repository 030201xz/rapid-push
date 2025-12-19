/**
 * 更新资源模块类型导出
 *
 * 供前端使用的类型定义
 * 注意：此模块无独立路由，通过 Updates 模块间接使用
 */

// ========== Schema 类型 ==========
export type { NewUpdateAsset, Platform, UpdateAsset } from './schema';

// ========== 常量导出 ==========
export { PLATFORM } from './schema';

// ========== Zod Schema（前端可复用验证） ==========
export {
  insertUpdateAssetSchema,
  selectUpdateAssetSchema,
} from './schema';

// ========== Service 返回类型 ==========
export type {
  CreateUpdateAssetResult,
  CreateUpdateAssetsResult,
  GetUpdateAssetResult,
  ListUpdateAssetsResult,
} from './service';
