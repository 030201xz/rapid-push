/**
 * 组织配置汇总
 */

import type { OrganizationConfig } from '../types';
import { demoOrganization } from './demo';

/** 所有组织配置 */
export const organizations: OrganizationConfig[] = [
  demoOrganization,
  // 扩展时在此添加更多组织
];

export { demoOrganization };
