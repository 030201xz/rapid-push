/**
 * Hot Update 初始化配置汇总导出
 */

import { organizations } from './01-organizations';
import { projects } from './02-projects';
import { channels } from './03-channels';
import type { HotUpdateInitConfig } from './types';

/** 完整初始化配置 */
export const hotUpdateConfig: HotUpdateInitConfig = {
  organizations,
  projects,
  channels,
};

// 重新导出子模块
export * from './01-organizations';
export * from './02-projects';
export * from './03-channels';
export * from './types';
