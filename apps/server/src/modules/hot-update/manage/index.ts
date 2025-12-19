/**
 * Manage 子域聚合入口
 *
 * 管理后台域：开发者使用的 CRUD 操作
 * - organizations: 组织管理
 * - projects: 项目管理
 * - channels: 渠道管理 + 代码签名
 * - updates: 版本发布
 * - directives: 回滚指令
 * - rolloutRules: 灰度规则
 */

import { router } from '@/common/trpc';

// ========== 导入各模块路由 ==========
import { channelsRouter } from './channels';
import { directivesRouter } from './directives';
import { organizationsRouter } from './organizations';
import { projectsRouter } from './projects';
import { rolloutRulesRouter } from './rollout-rules';
import { updatesRouter } from './updates';

// ========== Manage 子域路由聚合 ==========
export const manageRouter = router({
  organizations: organizationsRouter,
  projects: projectsRouter,
  channels: channelsRouter,
  updates: updatesRouter,
  directives: directivesRouter,
  rolloutRules: rolloutRulesRouter,
});

// ========== 重导出各模块 ==========
export { channelsRouter, ChannelsTypes } from './channels';
export { directivesRouter, DirectivesTypes } from './directives';
export {
  organizationsRouter,
  OrganizationsTypes,
} from './organizations';
export { projectsRouter, ProjectsTypes } from './projects';
export {
  rolloutRulesRouter,
  RolloutRulesTypes,
} from './rollout-rules';
export { updatesRouter, UpdatesTypes } from './updates';

// ========== 重导出 Schema（用于数据库迁移） ==========
export { channels } from './channels';
export { DIRECTIVE_TYPE, directives } from './directives';
export { organizations } from './organizations';
export { projects } from './projects';
export { ROLLOUT_RULE_TYPE, rolloutRules } from './rollout-rules';
export { updates } from './updates';
