/**
 * 灰度规则服务层
 *
 * 业务逻辑：纯函数，依赖注入 db
 * 管理灰度发布规则的 CRUD 和匹配逻辑
 */

import type { RapidSDatabase as Database } from '@/common/database/postgresql/rapid-s';
import { and, desc, eq } from 'drizzle-orm';
import {
  ROLLOUT_RULE_TYPE,
  rolloutRules,
  type NewRolloutRule,
  type RolloutRuleValue,
  type UpdateRolloutRule,
} from './schema';

// ========== 查询操作 ==========

/** 获取更新的所有灰度规则（按优先级倒序） */
export async function listRulesByUpdate(
  db: Database,
  updateId: string
) {
  return db
    .select()
    .from(rolloutRules)
    .where(eq(rolloutRules.updateId, updateId))
    .orderBy(desc(rolloutRules.priority));
}

/** 获取更新的启用规则 */
export async function listEnabledRulesByUpdate(
  db: Database,
  updateId: string
) {
  return db
    .select()
    .from(rolloutRules)
    .where(
      and(
        eq(rolloutRules.updateId, updateId),
        eq(rolloutRules.isEnabled, true)
      )
    )
    .orderBy(desc(rolloutRules.priority));
}

/** 根据 ID 获取规则 */
export async function getRuleById(db: Database, id: string) {
  const result = await db
    .select()
    .from(rolloutRules)
    .where(eq(rolloutRules.id, id));
  return result[0] ?? null;
}

// ========== 写入操作 ==========

/** 创建灰度规则 */
export async function createRule(db: Database, data: NewRolloutRule) {
  const [rule] = await db
    .insert(rolloutRules)
    .values(data)
    .returning();
  if (!rule) throw new Error('创建灰度规则失败');
  return rule;
}

/** 创建百分比灰度规则 */
export async function createPercentageRule(
  db: Database,
  updateId: string,
  percentage: number,
  priority = 0
) {
  return createRule(db, {
    updateId,
    type: ROLLOUT_RULE_TYPE.PERCENTAGE,
    value: { percentage } as RolloutRuleValue,
    priority,
    isEnabled: true,
  });
}

/** 创建设备白名单规则 */
export async function createDeviceIdRule(
  db: Database,
  updateId: string,
  deviceIds: string[],
  priority = 0
) {
  return createRule(db, {
    updateId,
    type: ROLLOUT_RULE_TYPE.DEVICE_ID,
    value: { include: deviceIds } as RolloutRuleValue,
    priority,
    isEnabled: true,
  });
}

/** 创建请求头匹配规则 */
export async function createHeaderMatchRule(
  db: Database,
  updateId: string,
  header: string,
  values: string[],
  priority = 0
) {
  return createRule(db, {
    updateId,
    type: ROLLOUT_RULE_TYPE.HEADER_MATCH,
    value: { header, values } as RolloutRuleValue,
    priority,
    isEnabled: true,
  });
}

/** 更新规则 */
export async function updateRule(
  db: Database,
  id: string,
  data: UpdateRolloutRule
) {
  const result = await db
    .update(rolloutRules)
    .set(data)
    .where(eq(rolloutRules.id, id))
    .returning();
  return result[0] ?? null;
}

/** 删除规则 */
export async function deleteRule(db: Database, id: string) {
  const result = await db
    .delete(rolloutRules)
    .where(eq(rolloutRules.id, id))
    .returning();
  return result.length > 0;
}

/** 删除更新的所有规则 */
export async function deleteRulesByUpdate(
  db: Database,
  updateId: string
) {
  const result = await db
    .delete(rolloutRules)
    .where(eq(rolloutRules.updateId, updateId))
    .returning();
  return result.length;
}

// ========== 规则匹配逻辑 ==========

/**
 * 检查设备是否匹配灰度规则
 * @param rules 按优先级排序的规则列表
 * @param context 匹配上下文
 * @returns 是否匹配
 */
export function matchRules(
  rules: Array<{ type: string; value: RolloutRuleValue }>,
  context: {
    deviceId?: string;
    headers?: Record<string, string>;
    randomSeed?: number; // 用于百分比灰度的随机种子
  }
): boolean {
  // 如果没有规则，默认匹配
  if (rules.length === 0) return true;

  for (const rule of rules) {
    const matched = matchRule(rule, context);
    if (matched) return true;
  }

  return false;
}

/** 匹配单条规则 */
function matchRule(
  rule: { type: string; value: RolloutRuleValue },
  context: {
    deviceId?: string;
    headers?: Record<string, string>;
    randomSeed?: number;
  }
): boolean {
  switch (rule.type) {
    case ROLLOUT_RULE_TYPE.PERCENTAGE: {
      const { percentage } = rule.value as { percentage: number };
      const seed = context.randomSeed ?? Math.random() * 100;
      return seed <= percentage;
    }

    case ROLLOUT_RULE_TYPE.DEVICE_ID: {
      const { include } = rule.value as { include: string[] };
      return context.deviceId
        ? include.includes(context.deviceId)
        : false;
    }

    case ROLLOUT_RULE_TYPE.HEADER_MATCH: {
      const { header, values } = rule.value as {
        header: string;
        values: string[];
      };
      const headerValue = context.headers?.[header];
      return headerValue ? values.includes(headerValue) : false;
    }

    default:
      return false;
  }
}

// ========== 类型导出（从函数推断，零维护成本） ==========

/** 规则列表返回类型 */
export type ListRulesResult = Awaited<
  ReturnType<typeof listRulesByUpdate>
>;

/** 单个规则返回类型（可能为 null） */
export type GetRuleResult = Awaited<ReturnType<typeof getRuleById>>;

/** 创建规则返回类型 */
export type CreateRuleResult = Awaited<ReturnType<typeof createRule>>;

/** 更新规则返回类型 */
export type UpdateRuleResult = Awaited<ReturnType<typeof updateRule>>;

/** 删除规则返回类型 */
export type DeleteRuleResult = Awaited<ReturnType<typeof deleteRule>>;
