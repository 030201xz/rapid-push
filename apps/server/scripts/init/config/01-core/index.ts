/**
 * 初始化配置汇总导出
 */

import { permissions } from './01-permissions';
import { roles } from './02-roles';
import { users } from './03-users';
import type { InitConfig } from './types';

/** 完整初始化配置 */
export const initConfig: InitConfig = {
  permissions,
  roles,
  users,
};

// 重新导出子模块
export * from './01-permissions';
export * from './02-roles';
export * from './03-users';
export * from './types';
