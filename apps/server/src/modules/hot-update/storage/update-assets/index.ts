/**
 * Update Assets 模块入口
 *
 * 注意：此模块无独立路由，通过 Updates 模块间接使用
 */

export { PLATFORM, updateAssets } from './schema';
export * as UpdateAssetsService from './service';
export * as UpdateAssetsTypes from './types';
