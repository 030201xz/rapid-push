/**
 * 资源模块类型导出
 *
 * 供前端使用的类型定义
 */

// ========== Schema 类型 ==========
export type { Asset, NewAsset } from './schema';

// ========== Zod Schema（前端可复用验证） ==========
export { insertAssetSchema, selectAssetSchema } from './schema';

// ========== Service 返回类型 ==========
export type {
  CreateAssetResult,
  DeleteAssetResult,
  GetAssetResult,
  ListAssetsResult,
} from './service';
