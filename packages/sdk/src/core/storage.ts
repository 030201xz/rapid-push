/**
 * 本地存储模块
 *
 * 使用 AsyncStorage 进行本地状态持久化
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

// ==================== 存储键常量 ====================

const STORAGE_PREFIX = '@rapid-s/';

export const StorageKeys = {
  /** 设备 ID */
  DEVICE_ID: `${STORAGE_PREFIX}device-id`,
  /** 上次检查更新时间 */
  LAST_CHECK_TIME: `${STORAGE_PREFIX}last-check-time`,
  /** 已忽略的更新 ID 列表 */
  DISMISSED_UPDATES: `${STORAGE_PREFIX}dismissed-updates`,
  /** 待上报的统计事件 */
  PENDING_ANALYTICS: `${STORAGE_PREFIX}pending-analytics`,
} as const;

// ==================== 通用存储操作 ====================

/**
 * 存储工具
 */
export const Storage = {
  /**
   * 获取字符串值
   */
  async getString(key: string): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(key);
    } catch {
      return null;
    }
  },

  /**
   * 设置字符串值
   */
  async setString(key: string, value: string): Promise<void> {
    try {
      await AsyncStorage.setItem(key, value);
    } catch {
      // 静默失败，存储不应阻塞主流程
    }
  },

  /**
   * 获取 JSON 对象
   */
  async getObject<T>(key: string): Promise<T | null> {
    try {
      const value = await AsyncStorage.getItem(key);
      return value ? (JSON.parse(value) as T) : null;
    } catch {
      return null;
    }
  },

  /**
   * 设置 JSON 对象
   */
  async setObject<T>(key: string, value: T): Promise<void> {
    try {
      await AsyncStorage.setItem(key, JSON.stringify(value));
    } catch {
      // 静默失败
    }
  },

  /**
   * 删除值
   */
  async remove(key: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(key);
    } catch {
      // 静默失败
    }
  },
};

// ==================== 设备 ID 管理 ====================

/**
 * 生成随机设备 ID
 */
function generateDeviceId(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 32; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * 获取或生成设备 ID
 *
 * 设备 ID 用于灰度规则的确定性匹配
 */
export async function getDeviceId(): Promise<string> {
  let deviceId = await Storage.getString(StorageKeys.DEVICE_ID);

  if (!deviceId) {
    deviceId = generateDeviceId();
    await Storage.setString(StorageKeys.DEVICE_ID, deviceId);
  }

  return deviceId;
}

// ==================== 已忽略更新管理 ====================

/**
 * 已忽略更新管理
 */
export const DismissedUpdates = {
  /**
   * 检查更新是否被忽略
   */
  async isDismissed(updateId: string): Promise<boolean> {
    const list = await Storage.getObject<string[]>(StorageKeys.DISMISSED_UPDATES);
    return list?.includes(updateId) ?? false;
  },

  /**
   * 添加到忽略列表
   */
  async add(updateId: string): Promise<void> {
    const list = (await Storage.getObject<string[]>(StorageKeys.DISMISSED_UPDATES)) ?? [];
    if (!list.includes(updateId)) {
      list.push(updateId);
      // 只保留最近 50 个忽略记录
      const trimmed = list.slice(-50);
      await Storage.setObject(StorageKeys.DISMISSED_UPDATES, trimmed);
    }
  },

  /**
   * 从忽略列表移除
   */
  async remove(updateId: string): Promise<void> {
    const list = (await Storage.getObject<string[]>(StorageKeys.DISMISSED_UPDATES)) ?? [];
    const filtered = list.filter((id) => id !== updateId);
    await Storage.setObject(StorageKeys.DISMISSED_UPDATES, filtered);
  },

  /**
   * 清空忽略列表
   */
  async clear(): Promise<void> {
    await Storage.remove(StorageKeys.DISMISSED_UPDATES);
  },
};

// ==================== 检查时间管理 ====================

/**
 * 获取上次检查时间
 */
export async function getLastCheckTime(): Promise<Date | null> {
  const timeStr = await Storage.getString(StorageKeys.LAST_CHECK_TIME);
  return timeStr ? new Date(timeStr) : null;
}

/**
 * 设置上次检查时间
 */
export async function setLastCheckTime(time: Date): Promise<void> {
  await Storage.setString(StorageKeys.LAST_CHECK_TIME, time.toISOString());
}
