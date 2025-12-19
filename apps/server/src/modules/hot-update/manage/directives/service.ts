/**
 * 指令服务层
 *
 * 业务逻辑：纯函数，依赖注入 db
 * 管理 Expo Updates 协议指令
 */

import type { RapidSDatabase as Database } from '@/common/database/postgresql/rapid-s';
import { and, eq, gt, isNull, or } from 'drizzle-orm';
import {
  DIRECTIVE_TYPE,
  directives,
  type NewDirective,
  type UpdateDirective,
} from './schema';

// ========== 查询操作 ==========

/** 获取渠道的所有指令 */
export async function listDirectivesByChannel(
  db: Database,
  channelId: string
) {
  return db
    .select()
    .from(directives)
    .where(eq(directives.channelId, channelId));
}

/** 获取渠道指定运行时版本的指令 */
export async function listDirectivesByRuntimeVersion(
  db: Database,
  channelId: string,
  runtimeVersion: string
) {
  return db
    .select()
    .from(directives)
    .where(
      and(
        eq(directives.channelId, channelId),
        eq(directives.runtimeVersion, runtimeVersion)
      )
    );
}

/** 根据 ID 获取指令 */
export async function getDirectiveById(db: Database, id: string) {
  const result = await db
    .select()
    .from(directives)
    .where(eq(directives.id, id));
  return result[0] ?? null;
}

/** 获取渠道当前激活的指令 */
export async function getActiveDirective(
  db: Database,
  channelId: string,
  runtimeVersion: string
) {
  const now = new Date();
  const result = await db
    .select()
    .from(directives)
    .where(
      and(
        eq(directives.channelId, channelId),
        eq(directives.runtimeVersion, runtimeVersion),
        eq(directives.isActive, true),
        // 未过期：expiresAt 为 null 或大于当前时间
        or(
          isNull(directives.expiresAt),
          gt(directives.expiresAt, now)
        )
      )
    )
    .limit(1);
  return result[0] ?? null;
}

// ========== 写入操作 ==========

/** 创建指令 */
export async function createDirective(
  db: Database,
  data: NewDirective
) {
  const [directive] = await db
    .insert(directives)
    .values(data)
    .returning();
  if (!directive) throw new Error('创建指令失败');
  return directive;
}

/** 创建回滚到嵌入版本指令 */
export async function createRollBackToEmbeddedDirective(
  db: Database,
  channelId: string,
  runtimeVersion: string,
  expiresAt?: Date
) {
  return createDirective(db, {
    channelId,
    runtimeVersion,
    type: DIRECTIVE_TYPE.ROLL_BACK_TO_EMBEDDED,
    isActive: true,
    expiresAt: expiresAt ?? null,
  });
}

/** 更新指令 */
export async function updateDirective(
  db: Database,
  id: string,
  data: UpdateDirective
) {
  const result = await db
    .update(directives)
    .set(data)
    .where(eq(directives.id, id))
    .returning();
  return result[0] ?? null;
}

/** 删除指令 */
export async function deleteDirective(db: Database, id: string) {
  const result = await db
    .delete(directives)
    .where(eq(directives.id, id))
    .returning();
  return result.length > 0;
}

/** 停用指令 */
export async function deactivateDirective(db: Database, id: string) {
  const result = await db
    .update(directives)
    .set({ isActive: false })
    .where(eq(directives.id, id))
    .returning();
  return result[0] ?? null;
}

// ========== 类型导出（从函数推断，零维护成本） ==========

/** 指令列表返回类型 */
export type ListDirectivesResult = Awaited<
  ReturnType<typeof listDirectivesByChannel>
>;

/** 单个指令返回类型（可能为 null） */
export type GetDirectiveResult = Awaited<
  ReturnType<typeof getDirectiveById>
>;

/** 创建指令返回类型 */
export type CreateDirectiveResult = Awaited<
  ReturnType<typeof createDirective>
>;

/** 更新指令返回类型 */
export type UpdateDirectiveResult = Awaited<
  ReturnType<typeof updateDirective>
>;

/** 删除指令返回类型 */
export type DeleteDirectiveResult = Awaited<
  ReturnType<typeof deleteDirective>
>;
