/**
 * 角色配置汇总
 */

import type { RoleConfig } from '../types';
import {
  orgAdminRole,
  orgMemberRole,
  orgOwnerRole,
} from './org-roles';
import { superAdminRole } from './super-admin';
import { userRole } from './user';

/** 所有角色配置 */
export const roles: RoleConfig[] = [
  superAdminRole,
  userRole,
  // 组织角色
  orgOwnerRole,
  orgAdminRole,
  orgMemberRole,
];

export {
  orgAdminRole,
  orgMemberRole,
  orgOwnerRole,
  superAdminRole,
  userRole,
};
