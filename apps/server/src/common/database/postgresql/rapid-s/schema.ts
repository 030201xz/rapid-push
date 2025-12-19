/**
 * 数据库 Schema 命名空间定义
 *
 * 所有表共用同一个 PostgreSQL schema
 * 根据环境变量 DATABASE_SCHEMA 决定使用自定义 schema 或默认 public
 */

import { env } from '@/common/env';
import { pgSchema } from 'drizzle-orm/pg-core';

/** 配置的 PostgreSQL Schema 名称，默认 public */
const schemaName = env.database.schema ?? 'rapid_s';

/**
 * 应用 Schema 实例
 *
 * - 如果是 'public'：直接使用 pgTable（Drizzle 默认行为）
 * - 如果是自定义 schema：使用 pgSchema 创建命名空间
 */
export const appSchema = pgSchema(schemaName);

/** 当前使用的 Schema 名称（用于 drizzle-kit 配置） */
export const SCHEMA_NAME = schemaName;
