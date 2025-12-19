/**
 * 灰度规则模块类型导出
 *
 * 供前端使用的类型定义
 */

// ========== Schema 类型 ==========
export type {
  NewRolloutRule,
  RolloutRule,
  RolloutRuleType,
  RolloutRuleValue,
  UpdateRolloutRule,
} from './schema';

// ========== 常量导出 ==========
export { ROLLOUT_RULE_TYPE } from './schema';

// ========== Zod Schema（前端可复用验证） ==========
export {
  insertRolloutRuleSchema,
  selectRolloutRuleSchema,
  updateRolloutRuleSchema,
} from './schema';

// ========== Service 返回类型 ==========
export type {
  CreateRuleResult,
  DeleteRuleResult,
  GetRuleResult,
  ListRulesResult,
  UpdateRuleResult,
} from './service';

// ========== 规则匹配函数 ==========
export { matchRules } from './service';
