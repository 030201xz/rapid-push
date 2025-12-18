/**
 * 用户领域实体
 */

import type { Brand } from '../../core/types';

/** 用户 ID 类型 */
export type UserId = Brand<string, 'UserId'>;

/** 用户状态 */
export type UserStatus = 'active' | 'inactive' | 'suspended';

/**
 * 用户实体
 *
 * 领域模型，包含业务规则和行为
 */
export interface User {
  /** 用户 ID */
  readonly id: UserId;

  /** 用户名 */
  username: string;

  /** 邮箱 */
  email: string;

  /** 密码哈希 */
  passwordHash: string;

  /** 用户状态 */
  status: UserStatus;

  /** 创建时间 */
  readonly createdAt: Date;

  /** 更新时间 */
  updatedAt: Date;
}

/**
 * 创建用户 ID
 */
export function createUserId(id: string): UserId {
  return id as UserId;
}

/**
 * 创建用户实体
 */
export function createUser(params: {
  id: string;
  username: string;
  email: string;
  passwordHash: string;
  status?: UserStatus;
  createdAt?: Date;
  updatedAt?: Date;
}): User {
  const now = new Date();
  return {
    id: createUserId(params.id),
    username: params.username,
    email: params.email,
    passwordHash: params.passwordHash,
    status: params.status ?? 'active',
    createdAt: params.createdAt ?? now,
    updatedAt: params.updatedAt ?? now,
  };
}

/**
 * 用户是否可以登录
 */
export function canUserLogin(user: User): boolean {
  return user.status === 'active';
}

/**
 * 更新用户信息
 */
export function updateUser(
  user: User,
  updates: Partial<Pick<User, 'username' | 'email' | 'status'>>,
): User {
  return {
    ...user,
    ...updates,
    updatedAt: new Date(),
  };
}
