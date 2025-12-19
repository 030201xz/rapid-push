/**
 * 用户配置汇总
 */

import type { UserConfig } from '../types';
import { systemAdminUser } from './system-admin';

/** 所有用户配置 */
export const users: UserConfig[] = [
  systemAdminUser,
  // 扩展时在此添加更多用户
];

export { systemAdminUser };
