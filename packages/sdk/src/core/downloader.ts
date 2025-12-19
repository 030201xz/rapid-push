/**
 * 资源下载器
 *
 * 封装 expo-updates 的资源下载功能
 */

import type { Manifest } from '../types';
import { createError } from '../utils';

/** 下载进度回调 */
export type DownloadProgressCallback = (progress: {
  /** 进度 0-1 */
  progress: number;
  /** 已下载字节数 */
  downloaded: number;
  /** 总字节数 */
  total: number;
}) => void;

/**
 * 资源下载器
 *
 * 使用 expo-updates 的底层能力下载更新资源
 */
export class AssetDownloader {
  /**
   * 下载更新
   *
   * 使用 expo-updates 的 fetchUpdateAsync 下载资源
   */
  async download(
    manifest: Manifest,
    onProgress?: DownloadProgressCallback
  ): Promise<void> {
    try {
      // 动态导入 expo-updates
      const Updates = await import('expo-updates');

      // 计算总资源大小（用于进度估算）
      const allAssets = [manifest.launchAsset, ...manifest.assets];
      const totalAssets = allAssets.length;

      // 通知开始下载
      onProgress?.({
        progress: 0,
        downloaded: 0,
        total: totalAssets,
      });

      // 调用 expo-updates 下载
      // expo-updates 会自动处理资源下载和存储
      await Updates.fetchUpdateAsync();

      // 下载完成
      onProgress?.({
        progress: 1,
        downloaded: totalAssets,
        total: totalAssets,
      });
    } catch (error) {
      // 转换为 SDK 错误
      if (error instanceof Error) {
        throw createError(
          'DOWNLOAD_FAILED',
          `下载失败: ${error.message}`,
          error
        );
      }
      throw createError('DOWNLOAD_FAILED', '下载失败: 未知错误');
    }
  }

  /**
   * 应用更新（重启 App）
   *
   * 调用 expo-updates 的 reloadAsync
   */
  async apply(): Promise<never> {
    try {
      const Updates = await import('expo-updates');
      await Updates.reloadAsync();

      // 理论上执行到这里说明重启失败
      throw createError('APPLY_FAILED', '应用更新失败: 重启未成功');
    } catch (error) {
      if (error instanceof Error && 'code' in error) {
        throw error; // 已经是 SDK 错误
      }
      throw createError(
        'APPLY_FAILED',
        `应用更新失败: ${
          error instanceof Error ? error.message : '未知错误'
        }`
      );
    }
  }

  /**
   * 检查 expo-updates 是否可用
   */
  async isAvailable(): Promise<boolean> {
    try {
      const Updates = await import('expo-updates');
      // 开发模式下 expo-updates 可能不可用
      return !Updates.isEmbeddedLaunch || Updates.isEnabled;
    } catch {
      return false;
    }
  }
}

/** 单例下载器 */
let downloaderInstance: AssetDownloader | null = null;

/**
 * 获取下载器实例
 */
export function getDownloader(): AssetDownloader {
  if (!downloaderInstance) {
    downloaderInstance = new AssetDownloader();
  }
  return downloaderInstance;
}
