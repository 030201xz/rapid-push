/**
 * Device 服务层
 *
 * 负责设备的创建、查询、信任管理等操作
 * 纯函数设计，依赖注入 db
 */

import type { RapidSDatabase as Database } from '@/common/database/postgresql/rapid-s';
import { and, eq } from 'drizzle-orm';
import { userDevices, type NewUserDevice } from '../schemas';

// ============================================================================
// 查询操作
// ============================================================================

/** 根据 ID 获取设备 */
export async function getDeviceById(db: Database, id: string) {
  const result = await db
    .select()
    .from(userDevices)
    .where(eq(userDevices.id, id));
  return result[0] ?? null;
}

/** 根据用户 ID 和设备指纹获取设备 */
export async function getDeviceByFingerprint(
  db: Database,
  userId: string,
  deviceFingerprint: string
) {
  const result = await db
    .select()
    .from(userDevices)
    .where(
      and(
        eq(userDevices.userId, userId),
        eq(userDevices.deviceFingerprint, deviceFingerprint)
      )
    );
  return result[0] ?? null;
}

/** 获取用户的所有设备 */
export async function getDevicesByUserId(
  db: Database,
  userId: string
) {
  return db
    .select()
    .from(userDevices)
    .where(
      and(
        eq(userDevices.userId, userId),
        eq(userDevices.isDisabled, false)
      )
    )
    .orderBy(userDevices.lastActiveAt);
}

/** 获取用户的可信设备 */
export async function getTrustedDevicesByUserId(
  db: Database,
  userId: string
) {
  return db
    .select()
    .from(userDevices)
    .where(
      and(
        eq(userDevices.userId, userId),
        eq(userDevices.isTrusted, true),
        eq(userDevices.isDisabled, false)
      )
    );
}

// ============================================================================
// 写入操作
// ============================================================================

/** 创建或更新设备信息 */
export async function upsertDevice(
  db: Database,
  userId: string,
  data: Omit<NewUserDevice, 'userId'>
) {
  // 先查找是否存在
  const existing = await getDeviceByFingerprint(
    db,
    userId,
    data.deviceFingerprint
  );

  if (existing) {
    // 更新现有设备
    const now = new Date();
    const [updated] = await db
      .update(userDevices)
      .set({
        deviceName: data.deviceName ?? existing.deviceName,
        deviceType: data.deviceType ?? existing.deviceType,
        browserInfo: data.browserInfo ?? existing.browserInfo,
        osInfo: data.osInfo ?? existing.osInfo,
        lastIpAddress: data.lastIpAddress ?? existing.lastIpAddress,
        lastLocation: data.lastLocation ?? existing.lastLocation,
        lastActiveAt: now,
        updatedAt: now,
      })
      .where(eq(userDevices.id, existing.id))
      .returning();
    return updated ?? existing;
  }

  // 创建新设备
  const [device] = await db
    .insert(userDevices)
    .values({ ...data, userId })
    .returning();
  if (!device) throw new Error('创建设备失败');
  return device;
}

/** 更新设备活跃时间和 IP */
export async function updateDeviceActivity(
  db: Database,
  deviceId: string,
  ipAddress: string,
  location?: string
) {
  const now = new Date();
  const result = await db
    .update(userDevices)
    .set({
      lastIpAddress: ipAddress,
      lastLocation: location,
      lastActiveAt: now,
      updatedAt: now,
    })
    .where(eq(userDevices.id, deviceId))
    .returning();
  return result[0] ?? null;
}

/** 设置设备为可信 */
export async function trustDevice(
  db: Database,
  deviceId: string,
  expiresAt?: Date
) {
  const now = new Date();
  const result = await db
    .update(userDevices)
    .set({
      isTrusted: true,
      trustedAt: now,
      trustExpiresAt: expiresAt ?? null,
      updatedAt: now,
    })
    .where(eq(userDevices.id, deviceId))
    .returning();
  return result[0] ?? null;
}

/** 取消设备信任 */
export async function untrustDevice(db: Database, deviceId: string) {
  const now = new Date();
  const result = await db
    .update(userDevices)
    .set({
      isTrusted: false,
      trustedAt: null,
      trustExpiresAt: null,
      updatedAt: now,
    })
    .where(eq(userDevices.id, deviceId))
    .returning();
  return result[0] ?? null;
}

/** 取消用户所有设备的信任 */
export async function untrustAllUserDevices(
  db: Database,
  userId: string
) {
  const now = new Date();
  const result = await db
    .update(userDevices)
    .set({
      isTrusted: false,
      trustedAt: null,
      trustExpiresAt: null,
      updatedAt: now,
    })
    .where(
      and(
        eq(userDevices.userId, userId),
        eq(userDevices.isTrusted, true)
      )
    )
    .returning();
  return result.length;
}

/** 禁用设备 */
export async function disableDevice(
  db: Database,
  deviceId: string,
  reason: string
) {
  const now = new Date();
  const result = await db
    .update(userDevices)
    .set({
      isDisabled: true,
      disabledReason: reason,
      disabledAt: now,
      isTrusted: false, // 禁用时同时取消信任
      updatedAt: now,
    })
    .where(eq(userDevices.id, deviceId))
    .returning();
  return result[0] ?? null;
}

/** 删除设备 */
export async function deleteDevice(db: Database, deviceId: string) {
  const result = await db
    .delete(userDevices)
    .where(eq(userDevices.id, deviceId))
    .returning();
  return result.length > 0;
}

// ============================================================================
// 类型导出
// ============================================================================

export type GetDeviceResult = Awaited<
  ReturnType<typeof getDeviceById>
>;
export type UpsertDeviceResult = Awaited<
  ReturnType<typeof upsertDevice>
>;
