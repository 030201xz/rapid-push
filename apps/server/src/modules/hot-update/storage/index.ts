/**
 * Storage 子域聚合入口
 *
 * 资源存储域：内容寻址存储相关
 * - assets: 资源文件（内容寻址存储）
 * - updateAssets: 更新-资源关联
 */

import { router } from '@/common/trpc';

// ========== 导入各模块路由 ==========
import { assetsRouter } from './assets';

// ========== Storage 子域路由聚合 ==========
// 注意：update-assets 无独立路由，通过 updates 模块间接使用
export const storageRouter = router({
  assets: assetsRouter,
});

// ========== 重导出各模块 ==========
export { assetsRouter, AssetsTypes } from './assets';
export {
  PLATFORM,
  updateAssets,
  UpdateAssetsService,
  UpdateAssetsTypes,
} from './update-assets';

// ========== 重导出 Schema ==========
export { assets } from './assets';
