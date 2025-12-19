/**
 * Rollout Rules Schema - 灰度发布规则表
 *
 * 核心设计:
 * - 支持多种灰度策略：百分比、设备白名单、请求头匹配
 * - 每个更新可配置多条规则
 * - 规则按优先级排序执行
 *
 * 约束:
 * - updateId 外键关联 updates.id
 * - 规则类型决定 value 的结构
 */

import { appSchema } from '@/common/database/postgresql/rapid-s/schema';
import {
  boolean,
  index,
  integer,
  jsonb,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { updates } from '../updates/schema';

// ========== 规则类型枚举 ==========
export const ROLLOUT_RULE_TYPE = {
  /** 百分比灰度 */
  PERCENTAGE: 'percentage',
  /** 设备 ID 白名单 */
  DEVICE_ID: 'device_id',
  /** 请求头匹配 */
  HEADER_MATCH: 'header_match',
} as const;

export type RolloutRuleType =
  (typeof ROLLOUT_RULE_TYPE)[keyof typeof ROLLOUT_RULE_TYPE];

// ========== 规则值类型 ==========
export type RolloutRuleValue =
  | { percentage: number } // 百分比灰度
  | { include: string[] } // 设备白名单
  | { header: string; values: string[] }; // 请求头匹配

// ========== 表定义 ==========
export const rolloutRules = appSchema.table(
  'rollout_rules',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    /** 所属更新 ID */
    updateId: uuid('update_id')
      .notNull()
      .references(() => updates.id, { onDelete: 'cascade' }),
    /** 规则类型 */
    type: varchar('type', { length: 20 }).notNull(),
    /** 规则值（JSON 结构由 type 决定） */
    value: jsonb('value').$type<RolloutRuleValue>().notNull(),
    /** 优先级（数值越大优先级越高） */
    priority: integer('priority').default(0).notNull(),
    /** 是否启用 */
    isEnabled: boolean('is_enabled').default(true).notNull(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  t => [
    // 为 updateId 建立索引
    index('idx_rollout_rules_update_id').on(t.updateId),
    // 为启用状态建立索引
    index('idx_rollout_rules_is_enabled').on(t.isEnabled),
    // 为优先级建立索引，优化规则排序
    index('idx_rollout_rules_priority').on(t.priority),
  ]
);

// ========== Zod Schema（自动派生） ==========

/** 创建灰度规则 Schema */
export const insertRolloutRuleSchema = createInsertSchema(
  rolloutRules
).omit({
  id: true,
  createdAt: true,
});

/** 更新灰度规则 Schema */
export const updateRolloutRuleSchema = createInsertSchema(
  rolloutRules
)
  .pick({
    value: true,
    priority: true,
    isEnabled: true,
  })
  .partial();

/** 查询灰度规则 Schema */
export const selectRolloutRuleSchema =
  createSelectSchema(rolloutRules);

// ========== 类型导出（从表定义推导） ==========
export type RolloutRule = typeof rolloutRules.$inferSelect;
export type NewRolloutRule = typeof rolloutRules.$inferInsert;
export type UpdateRolloutRule = Partial<
  Pick<NewRolloutRule, 'value' | 'priority' | 'isEnabled'>
>;
