/**
 * 数据库 Schema 命名空间定义
 *
 * 所有表共用同一个 PostgreSQL schema
 * 根据环境变量 DATABASE_SCHEMA 决定使用自定义 schema 或默认 public
 */

import { pgSchema } from 'drizzle-orm/pg-core';
import { env } from '@/common/env';

/** 配置的 PostgreSQL Schema 名称，默认 public */
const schemaName = env.database.schema ?? 'public';

/**
 * 应用 Schema 实例
 *
 * 使用 pgSchema 创建命名空间，所有表通过 appSchema.table() 定义
 */
export const appSchema = pgSchema(schemaName);

/** 当前使用的 Schema 名称（用于 drizzle-kit 配置） */
export const SCHEMA_NAME = schemaName;
