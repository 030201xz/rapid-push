/**
 * Users Schema - 用户信息表
 *
 * 核心设计:
 * - 存储用户基本信息和账号状态
 * - 使用 username 作为唯一登录标识
 * - 支持邮箱和手机号验证
 * - 支持账号启用/禁用、锁定、删除状态控制
 * - 软删除设计
 */

import { relations } from 'drizzle-orm';
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
import { appSchema } from '@/common/database/postgresql/rapid-s/schema';

// ========== 用户状态枚举 ==========
export const USER_STATUS = {
  /** 待验证 */
  PENDING_VERIFICATION: 'pending_verification',
  /** 已激活 */
  ACTIVE: 'active',
  /** 已禁用 */
  DISABLED: 'disabled',
  /** 已锁定 */
  LOCKED: 'locked',
} as const;

export type UserStatus = (typeof USER_STATUS)[keyof typeof USER_STATUS];

// ========== 性别枚举 ==========
export const GENDER = {
  /** 未知 */
  UNKNOWN: 0,
  /** 男 */
  MALE: 1,
  /** 女 */
  FEMALE: 2,
} as const;

export type Gender = (typeof GENDER)[keyof typeof GENDER];

// ========== 表定义 ==========
export const users = appSchema.table(
  'users',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    /** 用户名 (唯一登录标识) */
    username: varchar('username', { length: 50 }).notNull().unique(),
    /** 昵称 */
    nickname: varchar('nickname', { length: 100 }),
    /** 邮箱 (唯一) */
    email: varchar('email', { length: 255 }).unique(),
    /** 手机号 (唯一) */
    phone: varchar('phone', { length: 20 }).unique(),
    /** 密码哈希值 */
    passwordHash: varchar('password_hash', { length: 255 }).notNull(),
    /** 头像 URL */
    avatarUrl: text('avatar_url'),
    /** 个人简介 */
    bio: text('bio'),
    /** 性别 (0=未知, 1=男, 2=女) */
    gender: integer('gender').default(GENDER.UNKNOWN).notNull(),
    /** 出生日期 */
    birthDate: timestamp('birth_date'),
    /** 邮箱是否已验证 */
    isEmailVerified: boolean('is_email_verified').default(false).notNull(),
    /** 手机号是否已验证 */
    isPhoneVerified: boolean('is_phone_verified').default(false).notNull(),
    /** 用户状态: pending_verification | active | disabled | locked */
    status: varchar('status', { length: 30 })
      .default(USER_STATUS.PENDING_VERIFICATION)
      .notNull(),
    /** 账号锁定原因 (仅当 status=locked 时有值) */
    lockReason: text('lock_reason'),
    /** 账号锁定时间 */
    lockedAt: timestamp('locked_at'),
    /** 是否已删除 (软删除) */
    isDeleted: boolean('is_deleted').default(false).notNull(),
    /** 最后登录时间 */
    lastLoginAt: timestamp('last_login_at'),
    /** 最后登录 IP */
    lastLoginIp: varchar('last_login_ip', { length: 50 }),
    /** 密码最后修改时间 */
    passwordChangedAt: timestamp('password_changed_at'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  t => [
    // 为 username 建立唯一索引，优化登录查询
    index('idx_users_username').on(t.username),
    // 为 email 建立索引，优化邮箱查询
    index('idx_users_email').on(t.email),
    // 为 phone 建立索引，优化手机号查询
    index('idx_users_phone').on(t.phone),
    // 为用户状态建立索引，优化状态筛选
    index('idx_users_status').on(t.status),
    // 为账号状态和删除标记建立组合索引
    index('idx_users_status_deleted').on(t.status, t.isDeleted),
    // 为最后登录时间建立索引，优化活跃用户查询
    index('idx_users_last_login_at').on(t.lastLoginAt),
  ],
);

// ========== Zod Schema（自动派生） ==========

/** 创建用户 Schema（省略自动生成字段） */
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  isEmailVerified: true,
  isPhoneVerified: true,
  status: true,
  lockReason: true,
  lockedAt: true,
  isDeleted: true,
  lastLoginAt: true,
  lastLoginIp: true,
  passwordChangedAt: true,
  createdAt: true,
  updatedAt: true,
});

/** 更新用户 Schema（仅可修改的字段） */
export const updateUserSchema = createInsertSchema(users)
  .pick({
    nickname: true,
    email: true,
    phone: true,
    avatarUrl: true,
    bio: true,
    gender: true,
    birthDate: true,
  })
  .partial();

/** 查询用户 Schema */
export const selectUserSchema = createSelectSchema(users);

// ========== 类型导出（从表定义推导） ==========
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type UpdateUser = Partial<
  Pick<
    NewUser,
    'nickname' | 'email' | 'phone' | 'avatarUrl' | 'bio' | 'gender' | 'birthDate'
  >
>;

// ========== Relations 定义（延迟导入避免循环依赖） ==========
import { userRoleMappings } from '../../access-control/user-role-mappings/schema';

export const usersRelations = relations(users, ({ many }) => ({
  /** 用户拥有的角色映射 */
  roles: many(userRoleMappings),
}));
