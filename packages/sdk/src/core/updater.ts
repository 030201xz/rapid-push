/**
 * 核心 Updater 模块
 *
 * 薄封装 expo-updates API，提供类型安全的更新操作
 * 不捕获错误，让原始错误直接抛出以便调试
 */

import * as Updates from 'expo-updates';

import type { Manifest, ManifestAsset } from '../types/server';

// ==================== 类型转换工具 ====================

/**
 * 将 expo-updates manifest 转换为 SDK Manifest 类型
 *
 * expo-updates 的 manifest 类型较为宽泛，需要进行类型收窄
 */
function toManifest(expoManifest: Updates.Manifest): Manifest {
  // expo-updates 返回的 manifest 可能是不同格式
  // 需要处理 Expo Updates Protocol 格式
  const m = expoManifest as Record<string, unknown>;

  // 提取 launchAsset
  const launchAssetRaw = m['launchAsset'] as Record<string, unknown> | undefined;
  const launchAsset: ManifestAsset = launchAssetRaw
    ? {
        hash: (launchAssetRaw['hash'] as string) ?? '',
        key: (launchAssetRaw['key'] as string) ?? '',
        contentType: (launchAssetRaw['contentType'] as string) ?? 'application/javascript',
        fileExtension: (launchAssetRaw['fileExtension'] as string | null) ?? null,
        url: (launchAssetRaw['url'] as string) ?? '',
      }
    : {
        hash: '',
        key: 'index.bundle',
        contentType: 'application/javascript',
        fileExtension: '.bundle',
        url: '',
      };

  // 提取 assets
  const assetsRaw = (m['assets'] as Array<Record<string, unknown>>) ?? [];
  const assets: ManifestAsset[] = assetsRaw.map((a) => ({
    hash: (a['hash'] as string) ?? '',
    key: (a['key'] as string) ?? '',
    contentType: (a['contentType'] as string) ?? 'application/octet-stream',
    fileExtension: (a['fileExtension'] as string | null) ?? null,
    url: (a['url'] as string) ?? '',
  }));

  return {
    id: (m['id'] as string) ?? '',
    createdAt: (m['createdAt'] as string) ?? new Date().toISOString(),
    runtimeVersion: (m['runtimeVersion'] as string) ?? Updates.runtimeVersion ?? '',
    launchAsset,
    assets,
    metadata: (m['metadata'] as Record<string, string>) ?? {},
    extra: (m['extra'] as Record<string, unknown>) ?? {},
  };
}

// ==================== 核心 Updater 类 ====================

/**
 * Updater 核心类
 *
 * 提供更新检查、下载、应用的核心功能
 * 作为 expo-updates 的薄封装层
 * 不捕获错误，让原始错误直接抛出以便调试
 */
export class Updater {
  // ==================== 更新检查 ====================

  /**
   * 检查更新
   *
   * @returns 如果有更新可用返回 Manifest，否则返回 null
   * @throws 原始 expo-updates 错误
   */
  static async checkForUpdate(): Promise<Manifest | null> {
    // 调试日志：检查 expo-updates 状态
    console.log('[Updater] checkForUpdate 开始');
    console.log('[Updater] Updates.isEnabled:', Updates.isEnabled);
    console.log('[Updater] Updates.runtimeVersion:', Updates.runtimeVersion);
    console.log('[Updater] Updates.channel:', Updates.channel);
    console.log('[Updater] Updates.updateUrl:', (Updates as Record<string, unknown>)['updateUrl']);
    
    console.log('[Updater] 调用 Updates.checkForUpdateAsync...');
    const startTime = Date.now();
    
    const result = await Updates.checkForUpdateAsync();
    
    const elapsed = Date.now() - startTime;
    console.log(`[Updater] checkForUpdateAsync 完成，耗时 ${elapsed}ms`);
    console.log('[Updater] result.isAvailable:', result.isAvailable);
    console.log('[Updater] result.manifest:', result.manifest);

    if (!result.isAvailable || !result.manifest) {
      return null;
    }

    return toManifest(result.manifest);
  }

  // ==================== 下载更新 ====================

  /**
   * 下载更新
   *
   * @param onProgress 下载进度回调（expo-updates 暂不支持进度）
   * @throws 原始 expo-updates 错误
   */
  static async downloadUpdate(
    onProgress?: (progress: number) => void,
  ): Promise<void> {
    // expo-updates 的 fetchUpdateAsync 不支持进度回调
    // 这里模拟开始和结束
    onProgress?.(0);

    await Updates.fetchUpdateAsync();

    onProgress?.(1);
  }

  // ==================== 应用更新 ====================

  /**
   * 应用更新（重启应用）
   *
   * @throws 原始 expo-updates 错误
   */
  static async applyUpdate(): Promise<void> {
    await Updates.reloadAsync();
  }

  // ==================== 状态查询 ====================

  /**
   * 获取当前运行的更新信息
   */
  static getCurrentUpdate(): {
    updateId: string | null;
    runtimeVersion: string;
    createdAt: Date | null;
    isEmbedded: boolean;
  } {
    const manifest = Updates.manifest;
    const isEmbedded = Updates.isEmbeddedLaunch;

    if (!manifest || isEmbedded) {
      return {
        updateId: null,
        runtimeVersion: Updates.runtimeVersion ?? 'unknown',
        createdAt: null,
        isEmbedded: true,
      };
    }

    const m = manifest as Record<string, unknown>;

    return {
      updateId: (m['id'] as string) ?? null,
      runtimeVersion: (m['runtimeVersion'] as string) ?? Updates.runtimeVersion ?? 'unknown',
      createdAt: m['createdAt'] ? new Date(m['createdAt'] as string) : null,
      isEmbedded: false,
    };
  }

  /**
   * 获取运行时版本
   */
  static getRuntimeVersion(): string {
    return Updates.runtimeVersion ?? 'unknown';
  }

  /**
   * 检查 expo-updates 是否可用
   */
  static isAvailable(): boolean {
    // 在开发模式或未配置时，expo-updates 可能不可用
    return Updates.isEnabled;
  }

  /**
   * 获取更新通道信息
   */
  static getChannel(): string | null {
    return Updates.channel ?? null;
  }
}

// ==================== 便捷导出 ====================

export const checkForUpdate = Updater.checkForUpdate;
export const downloadUpdate = Updater.downloadUpdate;
export const applyUpdate = Updater.applyUpdate;
export const getCurrentUpdate = Updater.getCurrentUpdate;
export const isUpdaterAvailable = Updater.isAvailable;
