/**
 * 演示项目配置
 */

import type { ProjectConfig } from '../types';

/** 演示项目 - 用于展示和测试 */
export const demoProject: ProjectConfig = {
  key: 'DEMO_PROJECT',
  organizationKey: 'DEMO_ORG',
  name: 'Demo App',
  slug: 'demo-app',
  description: '演示项目，用于测试热更新推送',
  isDeleted: false,
};
