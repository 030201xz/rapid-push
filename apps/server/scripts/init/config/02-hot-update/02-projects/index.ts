/**
 * 项目配置汇总
 */

import type { ProjectConfig } from '../types';
import { demoProject } from './demo';

/** 所有项目配置 */
export const projects: ProjectConfig[] = [
  demoProject,
  // 扩展时在此添加更多项目
];

export { demoProject };
