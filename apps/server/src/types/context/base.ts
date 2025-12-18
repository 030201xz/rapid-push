/**
 * 基础 Context 类型
 *
 * 所有请求共享的上下文
 */

import type { RapidSDatabase } from '../../common/database/postgresql/rapid-s';

/** 基础 Context（所有请求共享） */
export interface BaseContext {
  /** Drizzle 数据库实例 */
  db: RapidSDatabase;
  /** 请求追踪 ID */
  requestId?: string;
  /** 获取当前认证用户（可能为 null） */
  getUser: () => Promise<AuthUser | null>;
}

// 前置声明，避免循环依赖
import type { AuthUser } from './auth';
