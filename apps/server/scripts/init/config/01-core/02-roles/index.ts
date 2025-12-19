/**
 * 角色配置汇总
 */

import type { RoleConfig } from '../types';
import { superAdminRole } from './super-admin';
import { userRole } from './user';

/** 所有角色配置 */
export const roles: RoleConfig[] = [
  superAdminRole,
  userRole,
  // 扩展时在此添加更多角色
];

export { superAdminRole, userRole };
