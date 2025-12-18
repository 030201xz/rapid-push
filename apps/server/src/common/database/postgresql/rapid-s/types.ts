/**
 * rapid-s 数据库类型定义
 *
 * 设计原则：
 * - 零 any：完全类型推导
 * - 类型复用：从 drizzle-orm 提取类型
 * - 简洁明确：不过度设计
 */

import type { ExtractTablesWithRelations } from 'drizzle-orm';
import type { PgTransaction } from 'drizzle-orm/pg-core';
import type {
  PostgresJsDatabase,
  PostgresJsQueryResultHKT,
} from 'drizzle-orm/postgres-js';

// ============================================================================
// Schema 类型（暂无 schema，预留扩展）
// ============================================================================

/** 当前数据库 Schema（后续从 schema 文件导入） */
// export type RapidSSchema = typeof schema;

/** 空 Schema 占位，后续替换为实际 Schema */
type EmptySchema = Record<string, never>;

// ============================================================================
// 数据库实例类型
// ============================================================================

/**
 * rapid-s Drizzle 数据库实例类型
 *
 * 支持 Query Builder 和 Relational Query
 */
export type RapidSDatabase = PostgresJsDatabase<EmptySchema>;

/**
 * rapid-s 事务客户端类型
 *
 * 在事务回调中使用的数据库实例
 */
export type RapidSTransactionClient = PgTransaction<
  PostgresJsQueryResultHKT,
  EmptySchema,
  ExtractTablesWithRelations<EmptySchema>
>;

/**
 * rapid-s 数据库执行上下文
 *
 * 普通数据库实例或事务客户端，用于统一处理事务场景
 */
export type RapidSDbContext = RapidSDatabase | RapidSTransactionClient;

// ============================================================================
// 连接配置类型
// ============================================================================

/** SSL 配置选项 */
export type SSLConfig =
  | boolean
  | 'require'
  | 'prefer'
  | {
      rejectUnauthorized?: boolean;
      ca?: string;
      cert?: string;
      key?: string;
    };

/**
 * 数据库连接配置
 */
export interface DatabaseConnectionConfig {
  /** 主机地址 */
  readonly host: string;

  /** 端口 */
  readonly port: number;

  /** 数据库名 */
  readonly database: string;

  /** 用户名 */
  readonly username: string;

  /** 密码 */
  readonly password: string;

  /** SSL 配置 */
  readonly ssl?: SSLConfig;

  /** 连接池最大连接数 (默认: 10) */
  readonly maxConnections?: number;

  /** 空闲连接超时秒数 (默认: 20) */
  readonly idleTimeout?: number;

  /** 连接最大生命周期秒数 */
  readonly maxLifetime?: number;

  /** 连接超时秒数 (默认: 10) */
  readonly connectTimeout?: number;

  /** 是否启用预处理语句（Supabase Transaction Pool 需设为 false） */
  readonly prepare?: boolean;

  /** 应用名称（用于 PostgreSQL 连接标识） */
  readonly applicationName?: string;
}

/**
 * 完整配置（合并默认值后）
 */
export interface ResolvedDatabaseConfig {
  readonly host: string;
  readonly port: number;
  readonly database: string;
  readonly username: string;
  readonly password: string;
  readonly ssl: SSLConfig;
  readonly maxConnections: number;
  readonly idleTimeout: number;
  readonly maxLifetime: number;
  readonly connectTimeout: number;
  readonly prepare: boolean;
  readonly applicationName: string;
}

// ============================================================================
// 健康检查类型
// ============================================================================

/** 数据库健康状态 */
export interface DatabaseHealthStatus {
  /** 是否健康 */
  readonly healthy: boolean;

  /** 延迟毫秒数 */
  readonly latencyMs: number;

  /** 错误信息（如果有） */
  readonly error?: string;

  /** 检查时间 */
  readonly checkedAt: Date;
}
