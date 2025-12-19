/**
 * User Refresh Tokens Schema - 用户刷新令牌表
 *
 * 核心设计 (JWT 最佳实践):
 * 1. Token 轮换 (Rotation): 每次刷新生成新 RT，旧 RT 立即失效
 * 2. 家族追踪 (Family): 同一会话的所有 RT 共享同一 family
 * 3. 重放检测: 已使用的 RT 被重复使用时，撤销整个家族
 * 4. 代数追踪: generation 记录轮换次数，parentTokenId 形成链条
 *
 * Token 轮换流程:
 * 1. 客户端使用 RT 请求刷新
 * 2. 验证 RT 有效性 (未过期、未撤销、未使用)
 * 3. 标记当前 RT 为已使用
 * 4. 生成新 RT (同 family，新 generation)
 * 5. 返回新 AT + 新 RT
 *
 * 重放攻击检测:
 * - 已使用的 RT 被再次使用 → 撤销整个 family
 * - 已撤销的 RT 被使用 → 撤销整个 family 和 session
 */

import { appSchema } from '@/common/database/postgresql/rapid-s/schema';
import {
  boolean,
  index,
  integer,
  text,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';

// ========== 表定义 ==========
export const userRefreshTokens = appSchema.table(
  'user_refresh_tokens',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    /** 关联的会话 ID (逻辑外键 → user_sessions.session_id) */
    sessionId: varchar('session_id', { length: 255 }).notNull(),
    /** Refresh Token 哈希值 (不存储原始 token) */
    tokenHash: varchar('token_hash', { length: 255 })
      .notNull()
      .unique(),
    /** Token 家族标识 (同一会话的所有 RT 共享) */
    family: varchar('family', { length: 255 }).notNull(),
    /** Token 代数 (轮换次数，从 1 开始递增) */
    generation: integer('generation').notNull().default(1),
    /** 父 Token ID (轮换时记录上一个 RT 的 ID) */
    parentTokenId: uuid('parent_token_id'),
    /** 是否已使用 */
    isUsed: boolean('is_used').default(false).notNull(),
    /** 使用时间 */
    usedAt: timestamp('used_at'),
    /** 是否已撤销 */
    isRevoked: boolean('is_revoked').default(false).notNull(),
    /** 撤销时间 */
    revokedAt: timestamp('revoked_at'),
    /** 撤销原因 */
    revokeReason: varchar('revoke_reason', { length: 100 }),
    /** Token 过期时间 */
    expiresAt: timestamp('expires_at').notNull(),
    /** 创建时的 IP 地址 (审计用) */
    ipAddress: varchar('ip_address', { length: 50 }),
    /** 创建时的 User Agent (审计用) */
    userAgent: text('user_agent'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  t => [
    // Token 验证 (最高频查询)
    index('idx_refresh_tokens_token_hash').on(t.tokenHash),
    // 会话关联
    index('idx_refresh_tokens_session_id').on(t.sessionId),
    // 家族查询 (重放检测)
    index('idx_refresh_tokens_family').on(t.family),
    // 活跃 Token 查询
    index('idx_refresh_tokens_session_status').on(
      t.sessionId,
      t.isUsed,
      t.isRevoked
    ),
    // 轮换链条
    index('idx_refresh_tokens_family_generation').on(
      t.family,
      t.generation
    ),
    // 父 Token 追溯
    index('idx_refresh_tokens_parent_token_id').on(t.parentTokenId),
    // 过期清理
    index('idx_refresh_tokens_expires_at').on(t.expiresAt),
    // 有效性检查
    index('idx_refresh_tokens_validity').on(
      t.isUsed,
      t.isRevoked,
      t.expiresAt
    ),
  ]
);

// ========== Zod Schema ==========

/** 创建 Refresh Token Schema */
export const insertRefreshTokenSchema = createInsertSchema(
  userRefreshTokens
).omit({
  id: true,
  isUsed: true,
  usedAt: true,
  isRevoked: true,
  revokedAt: true,
  revokeReason: true,
  createdAt: true,
  updatedAt: true,
});

/** 查询 Refresh Token Schema */
export const selectRefreshTokenSchema =
  createSelectSchema(userRefreshTokens);

// ========== 类型导出 ==========
export type UserRefreshToken = typeof userRefreshTokens.$inferSelect;
export type NewUserRefreshToken =
  typeof userRefreshTokens.$inferInsert;
