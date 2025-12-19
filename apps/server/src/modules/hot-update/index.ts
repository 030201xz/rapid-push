/**
 * Hot Update 域聚合入口
 *
 * 包含热更新服务的所有模块：
 * - organizations: 组织管理
 * - projects: 项目管理
 * - channels: 渠道管理 + 代码签名
 * - assets: 资源文件管理
 * - updates: 更新发布
 * - directives: 指令管理
 * - rolloutRules: 灰度发布规则
 */

import { router } from '@/common/trpc';

// ========== 导入各模块路由 ==========
import { assetsRouter } from './assets';
import { channelsRouter } from './channels';
import { directivesRouter } from './directives';
import { organizationsRouter } from './organizations';
import { projectsRouter } from './projects';
import { rolloutRulesRouter } from './rollout-rules';
import { updatesRouter } from './updates';

// ========== Hot Update 域路由聚合 ==========
export const hotUpdateRouter = router({
  organizations: organizationsRouter,
  projects: projectsRouter,
  channels: channelsRouter,
  assets: assetsRouter,
  updates: updatesRouter,
  directives: directivesRouter,
  rolloutRules: rolloutRulesRouter,
});

// ========== 重导出各模块 ==========
export { assetsRouter, AssetsTypes } from './assets';
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
export { assets } from './assets';
export { channels } from './channels';
export { DIRECTIVE_TYPE, directives } from './directives';
export { organizations } from './organizations';
export { projects } from './projects';
export { ROLLOUT_RULE_TYPE, rolloutRules } from './rollout-rules';
export {
  PLATFORM,
  updateAssets,
  UpdateAssetsService,
  UpdateAssetsTypes,
} from './update-assets';
export { updates } from './updates';
