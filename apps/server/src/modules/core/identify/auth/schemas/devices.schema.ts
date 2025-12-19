/**
 * User Devices Schema - 用户设备表
 *
 * 核心设计:
 * - 记录用户登录使用的设备信息
 * - 支持设备信任机制 (可信设备可跳过部分验证)
 * - 用于多设备管理和安全审计
 */

import { appSchema } from '@/common/database/postgresql/rapid-s/schema';
import { relations } from 'drizzle-orm';
import {
  boolean,
  foreignKey,
  index,
  text,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { users } from '../../users/schema';
import type { DeviceType } from '../constants';

// ========== 表定义 ==========
export const userDevices = appSchema.table(
  'user_devices',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    /** 用户 ID (逻辑外键 → users.id) */
    userId: uuid('user_id').notNull(),
    /** 设备指纹 (客户端生成的唯一标识) */
    deviceFingerprint: varchar('device_fingerprint', {
      length: 255,
    }).notNull(),
    /** 设备名称 (用户可自定义，如 "我的 MacBook") */
    deviceName: varchar('device_name', { length: 255 }),
    /** 设备类型 (desktop, mobile, tablet, api, unknown) */
    deviceType: varchar('device_type', {
      length: 50,
    }).$type<DeviceType>(),
    /** 浏览器信息 */
    browserInfo: varchar('browser_info', { length: 255 }),
    /** 操作系统信息 */
    osInfo: varchar('os_info', { length: 255 }),
    /** 最后使用的 IP 地址 */
    lastIpAddress: varchar('last_ip_address', { length: 50 }),
    /** 最后使用的地理位置 */
    lastLocation: varchar('last_location', { length: 255 }),
    /** 最后活跃时间 */
    lastActiveAt: timestamp('last_active_at').notNull().defaultNow(),
    /** 是否为可信设备 */
    isTrusted: boolean('is_trusted').default(false).notNull(),
    /** 信任授权时间 */
    trustedAt: timestamp('trusted_at'),
    /** 信任过期时间 (可选，null 表示永久信任) */
    trustExpiresAt: timestamp('trust_expires_at'),
    /** 是否已禁用 (禁用后不可用于登录) */
    isDisabled: boolean('is_disabled').default(false).notNull(),
    /** 禁用原因 */
    disabledReason: text('disabled_reason'),
    /** 禁用时间 */
    disabledAt: timestamp('disabled_at'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  t => [
    // 用户设备列表查询
    index('idx_user_devices_user_id').on(t.userId),
    // 设备指纹查找 (登录时匹配设备)
    index('idx_user_devices_fingerprint').on(
      t.userId,
      t.deviceFingerprint
    ),
    // 可信设备查询
    index('idx_user_devices_trusted').on(t.userId, t.isTrusted),
    // 活跃度排序
    index('idx_user_devices_last_active').on(t.lastActiveAt),
    // 设备状态查询
    index('idx_user_devices_status').on(t.userId, t.isDisabled),
    // ========== 外键约束 ==========
    foreignKey({
      columns: [t.userId],
      foreignColumns: [users.id],
      name: 'fk_user_devices_user_id',
    }).onDelete('cascade'),
  ]
);

// ========== Relations 定义 ==========
import { userSessions } from './sessions.schema';

export const userDevicesRelations = relations(
  userDevices,
  ({ one, many }) => ({
    /** 所属用户 */
    user: one(users, {
      fields: [userDevices.userId],
      references: [users.id],
    }),
    /** 使用此设备的会话 */
    sessions: many(userSessions),
  })
);

// ========== Zod Schema ==========

/** 创建设备 Schema */
export const insertDeviceSchema = createInsertSchema(
  userDevices
).omit({
  id: true,
  isTrusted: true,
  trustedAt: true,
  trustExpiresAt: true,
  isDisabled: true,
  disabledReason: true,
  disabledAt: true,
  createdAt: true,
  updatedAt: true,
});

/** 查询设备 Schema */
export const selectDeviceSchema = createSelectSchema(userDevices);

// ========== 类型导出 ==========
export type UserDevice = typeof userDevices.$inferSelect;
export type NewUserDevice = typeof userDevices.$inferInsert;
