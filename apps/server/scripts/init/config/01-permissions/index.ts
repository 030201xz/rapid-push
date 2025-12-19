/**
 * 权限配置汇总
 */

import type { PermissionConfig } from '../types';
import { systemPermissions } from './system';

/** 所有权限配置 */
export const permissions: PermissionConfig[] = [
  ...systemPermissions,
  // 扩展时在此添加更多权限模块
];

export { systemPermissions };
