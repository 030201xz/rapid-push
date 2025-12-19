/**
 * 渠道服务层
 *
 * 业务逻辑：纯函数，依赖注入 db
 * 包含渠道 CRUD 和代码签名密钥管理
 */

import type { RapidSDatabase as Database } from '@/common/database/postgresql/rapid-s';
import { and, eq } from 'drizzle-orm';
import {
  channels,
  type NewChannel,
  type UpdateChannel,
} from './schema';

// ========== 工具函数 ==========

/** 生成随机渠道密钥 */
function generateChannelKey(): string {
  const chars =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = 'ch_';
  for (let i = 0; i < 32; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// ========== 查询操作 ==========

/** 获取项目下的所有渠道（排除已删除） */
export async function listChannelsByProject(
  db: Database,
  projectId: string
) {
  return db
    .select()
    .from(channels)
    .where(
      and(
        eq(channels.projectId, projectId),
        eq(channels.isDeleted, false)
      )
    );
}

/** 根据 ID 获取渠道 */
export async function getChannelById(db: Database, id: string) {
  const result = await db
    .select()
    .from(channels)
    .where(and(eq(channels.id, id), eq(channels.isDeleted, false)));
  return result[0] ?? null;
}

/** 根据 channelKey 获取渠道（用于客户端鉴权） */
export async function getChannelByKey(
  db: Database,
  channelKey: string
) {
  const result = await db
    .select()
    .from(channels)
    .where(
      and(
        eq(channels.channelKey, channelKey),
        eq(channels.isDeleted, false)
      )
    );
  return result[0] ?? null;
}

/** 根据项目和名称获取渠道 */
export async function getChannelByName(
  db: Database,
  projectId: string,
  name: string
) {
  const result = await db
    .select()
    .from(channels)
    .where(
      and(
        eq(channels.projectId, projectId),
        eq(channels.name, name),
        eq(channels.isDeleted, false)
      )
    );
  return result[0] ?? null;
}

// ========== 写入操作 ==========

/** 创建渠道（自动生成 channelKey） */
export async function createChannel(
  db: Database,
  data: Omit<NewChannel, 'channelKey'>
) {
  const channelKey = generateChannelKey();
  const [channel] = await db
    .insert(channels)
    .values({ ...data, channelKey })
    .returning();
  if (!channel) throw new Error('创建渠道失败');
  return channel;
}

/** 更新渠道 */
export async function updateChannel(
  db: Database,
  id: string,
  data: UpdateChannel
) {
  const result = await db
    .update(channels)
    .set({ ...data, updatedAt: new Date() })
    .where(and(eq(channels.id, id), eq(channels.isDeleted, false)))
    .returning();
  return result[0] ?? null;
}

/** 软删除渠道 */
export async function deleteChannel(db: Database, id: string) {
  const result = await db
    .update(channels)
    .set({ isDeleted: true, updatedAt: new Date() })
    .where(eq(channels.id, id))
    .returning();
  return result.length > 0;
}

// ========== 密钥管理 ==========

/** 重新生成渠道密钥 */
export async function regenerateChannelKey(db: Database, id: string) {
  const newKey = generateChannelKey();
  const result = await db
    .update(channels)
    .set({ channelKey: newKey, updatedAt: new Date() })
    .where(and(eq(channels.id, id), eq(channels.isDeleted, false)))
    .returning();
  return result[0] ?? null;
}

/** 设置代码签名密钥对 */
export async function setSigningKeys(
  db: Database,
  id: string,
  privateKey: string,
  publicKey: string
) {
  const result = await db
    .update(channels)
    .set({
      privateKey,
      publicKey,
      signingEnabled: true,
      updatedAt: new Date(),
    })
    .where(and(eq(channels.id, id), eq(channels.isDeleted, false)))
    .returning();
  return result[0] ?? null;
}

/** 禁用代码签名 */
export async function disableSigning(db: Database, id: string) {
  const result = await db
    .update(channels)
    .set({ signingEnabled: false, updatedAt: new Date() })
    .where(and(eq(channels.id, id), eq(channels.isDeleted, false)))
    .returning();
  return result[0] ?? null;
}

/** 获取渠道公钥（用于客户端验证） */
export async function getPublicKey(db: Database, id: string) {
  const channel = await getChannelById(db, id);
  return channel?.publicKey ?? null;
}

// ========== 类型导出（从函数推断，零维护成本） ==========

/** 渠道列表返回类型 */
export type ListChannelsResult = Awaited<
  ReturnType<typeof listChannelsByProject>
>;

/** 单个渠道返回类型（可能为 null） */
export type GetChannelResult = Awaited<
  ReturnType<typeof getChannelById>
>;

/** 创建渠道返回类型 */
export type CreateChannelResult = Awaited<
  ReturnType<typeof createChannel>
>;

/** 更新渠道返回类型 */
export type UpdateChannelResult = Awaited<
  ReturnType<typeof updateChannel>
>;

/** 删除渠道返回类型 */
export type DeleteChannelResult = Awaited<
  ReturnType<typeof deleteChannel>
>;
