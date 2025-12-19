/**
 * 设备信息工具
 *
 * 获取设备 ID、平台信息等
 */

import { Platform } from 'react-native';

import type { DeviceInfo, Platform as PlatformType } from '../types';

/** 缓存的设备 ID */
let cachedDeviceId: string | null = null;

/**
 * 生成随机设备 ID
 * 使用 UUID v4 格式
 */
function generateDeviceId(): string {
  // 简单的 UUID v4 生成（React Native 环境）
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(
    /[xy]/g,
    c => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    }
  );
}

/**
 * 获取或生成设备 ID
 *
 * 优先从 expo-constants 获取，否则生成随机 ID
 * 生成的 ID 会被缓存供后续使用
 */
export async function getDeviceId(): Promise<string> {
  // 已缓存则直接返回
  if (cachedDeviceId) {
    return cachedDeviceId;
  }

  try {
    // 尝试从 expo-constants 获取安装 ID
    const Constants = await import('expo-constants');
    const installationId = Constants.default.installationId;

    if (installationId) {
      cachedDeviceId = installationId;
      return installationId;
    }
  } catch {
    // expo-constants 不可用，忽略
  }

  // 回退到生成随机 ID
  cachedDeviceId = generateDeviceId();
  return cachedDeviceId;
}

/**
 * 获取当前平台
 */
export function getPlatform(): PlatformType {
  const os = Platform.OS;
  if (os === 'ios' || os === 'android') {
    return os;
  }
  // 默认返回 android（理论上不应发生）
  return 'android';
}

/**
 * 获取平台版本
 */
export function getPlatformVersion(): string {
  return String(Platform.Version);
}

/**
 * 获取完整设备信息
 */
export async function getDeviceInfo(): Promise<DeviceInfo> {
  return {
    deviceId: await getDeviceId(),
    platform: getPlatform(),
    platformVersion: getPlatformVersion(),
  };
}
