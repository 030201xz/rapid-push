/**
 * 本地存储工具
 *
 * 使用 @react-native-async-storage/async-storage 作为存储后端
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

/** 存储键常量 */
export const STORAGE_KEYS = {
  DEVICE_ID: '@rapid-push/device-id',
  LAST_CHECK_TIME: '@rapid-push/last-check-time',
  DISMISSED_UPDATES: '@rapid-push/dismissed-updates',
  ANALYTICS_QUEUE: '@rapid-push/analytics-queue',
} as const;

export type StorageKey =
  (typeof STORAGE_KEYS)[keyof typeof STORAGE_KEYS];

/**
 * 存储接口
 */
export interface StorageAdapter {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}

/**
 * 存储工具类
 *
 * 封装 AsyncStorage，提供类型安全的存储操作
 */
export const Storage = {
  /** 获取字符串值 */
  async getString(key: StorageKey): Promise<string | null> {
    return AsyncStorage.getItem(key);
  },

  /** 设置字符串值 */
  async setString(key: StorageKey, value: string): Promise<void> {
    await AsyncStorage.setItem(key, value);
  },

  /** 获取 JSON 值 */
  async getJSON<T>(key: StorageKey): Promise<T | null> {
    const str = await AsyncStorage.getItem(key);
    if (!str) return null;
    try {
      return JSON.parse(str) as T;
    } catch {
      return null;
    }
  },

  /** 设置 JSON 值 */
  async setJSON<T>(key: StorageKey, value: T): Promise<void> {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  },

  /** 删除值 */
  async remove(key: StorageKey): Promise<void> {
    await AsyncStorage.removeItem(key);
  },
};

/**
 * 已忽略更新管理
 */
export const DismissedUpdates = {
  /** 添加已忽略的更新 ID */
  async add(updateId: string): Promise<void> {
    const list = await this.getAll();
    if (!list.includes(updateId)) {
      list.push(updateId);
      // 只保留最近 10 个
      const trimmed = list.slice(-10);
      await Storage.setJSON(STORAGE_KEYS.DISMISSED_UPDATES, trimmed);
    }
  },

  /** 检查更新是否已被忽略 */
  async isDismissed(updateId: string): Promise<boolean> {
    const list = await this.getAll();
    return list.includes(updateId);
  },

  /** 获取所有已忽略的更新 ID */
  async getAll(): Promise<string[]> {
    return (
      (await Storage.getJSON<string[]>(
        STORAGE_KEYS.DISMISSED_UPDATES
      )) ?? []
    );
  },

  /** 清除所有 */
  async clear(): Promise<void> {
    await Storage.remove(STORAGE_KEYS.DISMISSED_UPDATES);
  },
};
