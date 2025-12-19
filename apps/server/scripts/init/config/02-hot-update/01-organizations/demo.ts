/**
 * 演示组织配置
 */

import type { OrganizationConfig } from '../types';

/** 演示组织 - 用于展示和测试 */
export const demoOrganization: OrganizationConfig = {
  key: 'DEMO_ORG',
  name: 'Demo Organization',
  slug: 'demo',
  description: '演示组织，用于测试热更新功能',
  ownerKey: 'SYSTEM_ADMIN',
  isDeleted: false,
};
