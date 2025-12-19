/**
 * User Sessions Schema - 用户会话表
 *
 * 核心设计:
 * - 管理用户登录会话的元信息
 * - 一个会话对应一次登录行为
 * - 会话可以关联多个 Refresh Token (Token 轮换机制)
 * - 记录登录设备和 IP 信息
 * - 撤销会话时同步撤销所有关联的 RT
 *
 * 约束 (应用层保证):
 * - userId 必须存在于 users 表
 * - sessionId 必须全局唯一
 */

import { appSchema } from '@/common/database/postgresql/rapid-s/schema';
import {
  boolean,
  index,
  text,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';

// ========== 表定义 ==========
export const userSessions = appSchema.table(
  'user_sessions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    /** 用户 ID (逻辑外键 → users.id) */
    userId: uuid('user_id').notNull(),
    /** 会话唯一标识 (用于关联 Refresh Token) */
    sessionId: varchar('session_id', { length: 255 })
      .notNull()
      .unique(),
    /** 登录 IP 地址 */
    ipAddress: varchar('ip_address', { length: 50 }),
    /** User Agent */
    userAgent: text('user_agent'),
    /** 设备 ID (外键 → user_devices.id，可选) */
    deviceId: uuid('device_id'),
    /** 登录地理位置 (城市级别，可选) */
    loginLocation: varchar('login_location', { length: 255 }),
    /** 是否已撤销 */
    isRevoked: boolean('is_revoked').default(false).notNull(),
    /** 撤销时间 */
    revokedAt: timestamp('revoked_at'),
    /** 撤销原因 */
    revokeReason: varchar('revoke_reason', { length: 100 }),
    /** 最后活跃时间 (每次使用 RT 刷新时更新) */
    lastActivityAt: timestamp('last_activity_at')
      .notNull()
      .defaultNow(),
    /** 会话过期时间 (默认 30 天) */
    expiresAt: timestamp('expires_at').notNull(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  t => [
    // 用户会话查询
    index('idx_user_sessions_user_id').on(t.userId),
    // 会话查找
    index('idx_user_sessions_session_id').on(t.sessionId),
    // 用户活跃会话查询
    index('idx_user_sessions_user_revoked').on(t.userId, t.isRevoked),
    // 设备会话查询
    index('idx_user_sessions_device_id').on(t.deviceId),
    // 过期会话清理
    index('idx_user_sessions_expires_at').on(t.expiresAt),
    // 活跃度排序
    index('idx_user_sessions_last_activity_at').on(t.lastActivityAt),
  ]
);

// ========== Zod Schema ==========

/** 创建会话 Schema */
export const insertSessionSchema = createInsertSchema(
  userSessions
).omit({
  id: true,
  isRevoked: true,
  revokedAt: true,
  revokeReason: true,
  lastActivityAt: true,
  createdAt: true,
  updatedAt: true,
});

/** 查询会话 Schema */
export const selectSessionSchema = createSelectSchema(userSessions);

// ========== 类型导出 ==========
export type UserSession = typeof userSessions.$inferSelect;
export type NewUserSession = typeof userSessions.$inferInsert;
