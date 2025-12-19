/**
 * RapidPush 核心类
 *
 * SDK 的主入口，封装所有更新相关功能
 */

import type {
  CheckUpdateResponse,
  CurrentUpdateInfo,
  DeviceInfo,
  Manifest,
  RapidPushConfig,
} from '../types';
import { RESPONSE_TYPE } from '../types';
import {
  DismissedUpdates,
  getDeviceId,
  getDeviceInfo,
  getPlatform,
  Storage,
  STORAGE_KEYS,
  toRapidPushError,
} from '../utils';

import {
  AnalyticsReporter,
  createAnalyticsReporter,
} from './analytics';
import { ApiClient, createApiClient } from './api-client';
import {
  AssetDownloader,
  getDownloader,
  type DownloadProgressCallback,
} from './downloader';

/**
 * 检查更新选项
 */
export interface CheckOptions {
  /** 是否忽略已忽略的更新 */
  readonly ignoreDissmissed?: boolean;
}

/**
 * RapidPush SDK 核心类
 */
export class RapidPush {
  private readonly config: Readonly<RapidPushConfig>;
  private readonly apiClient: ApiClient;
  private readonly downloader: AssetDownloader;
  private readonly analytics: AnalyticsReporter;
  private initialized: boolean = false;

  private constructor(config: RapidPushConfig) {
    this.config = Object.freeze({ ...config });
    this.apiClient = createApiClient(config);
    this.downloader = getDownloader();
    this.analytics = createAnalyticsReporter(this.apiClient, config);
  }

  /**
   * 创建 SDK 实例
   */
  static create(config: RapidPushConfig): RapidPush {
    return new RapidPush(config);
  }

  /**
   * 初始化（异步）
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    // 设置统计上下文
    const current = await this.getCurrentUpdate();
    this.analytics.setContext(
      current.updateId,
      current.runtimeVersion
    );

    // 上报启动成功事件（如果是热更新版本）
    if (!current.isEmbedded) {
      await this.analytics.track('apply_success');
    }

    this.initialized = true;
  }

  /**
   * 检查更新
   */
  async checkForUpdate(
    options?: CheckOptions
  ): Promise<CheckUpdateResponse> {
    try {
      // 记录检查事件
      await this.analytics.track('update_check');

      // 获取设备信息
      const deviceId = await getDeviceId();
      const platform = getPlatform();

      // 获取运行时版本
      const runtimeVersion = await this.getRuntimeVersion();

      // 获取当前更新 ID
      const current = await this.getCurrentUpdate();

      // 调用 API 检查更新
      const result = await this.apiClient.checkForUpdate({
        runtimeVersion,
        platform,
        deviceId,
        currentUpdateId: current.updateId ?? undefined,
      });

      // 检查是否已忽略
      if (
        result.type === RESPONSE_TYPE.UPDATE_AVAILABLE &&
        !options?.ignoreDissmissed
      ) {
        const isDismissed = await DismissedUpdates.isDismissed(
          result.manifest.id
        );
        if (isDismissed) {
          return { type: RESPONSE_TYPE.NO_UPDATE };
        }
      }

      // 记录检查时间
      await Storage.setString(
        STORAGE_KEYS.LAST_CHECK_TIME,
        new Date().toISOString()
      );

      return result;
    } catch (error) {
      throw toRapidPushError(error);
    }
  }

  /**
   * 下载更新
   */
  async downloadUpdate(
    manifest: Manifest,
    onProgress?: DownloadProgressCallback
  ): Promise<void> {
    try {
      // 记录下载开始
      await this.analytics.track('download_start', {
        updateId: manifest.id,
      });

      // 执行下载
      await this.downloader.download(manifest, onProgress);

      // 记录下载完成
      await this.analytics.track('download_complete', {
        updateId: manifest.id,
      });
    } catch (error) {
      // 记录下载失败
      await this.analytics.track('download_failed', {
        updateId: manifest.id,
        error: String(error),
      });
      throw toRapidPushError(error);
    }
  }

  /**
   * 应用更新（重启 App）
   */
  async applyUpdate(): Promise<never> {
    try {
      // 记录应用开始
      await this.analytics.track('apply_start');

      // 刷新统计
      await this.analytics.flush();

      // 重启应用
      return await this.downloader.apply();
    } catch (error) {
      // 记录应用失败
      await this.analytics.track('apply_failed', {
        error: String(error),
      });
      throw toRapidPushError(error);
    }
  }

  /**
   * 回滚到嵌入版本
   */
  async rollbackToEmbedded(): Promise<never> {
    try {
      // 记录回滚
      await this.analytics.track('rollback');
      await this.analytics.flush();

      // 重启（expo-updates 会自动加载嵌入版本）
      return await this.downloader.apply();
    } catch (error) {
      throw toRapidPushError(error);
    }
  }

  /**
   * 忽略更新
   */
  async dismissUpdate(updateId: string): Promise<void> {
    await DismissedUpdates.add(updateId);
  }

  /**
   * 获取当前更新信息
   */
  async getCurrentUpdate(): Promise<CurrentUpdateInfo> {
    try {
      const Updates = await import('expo-updates');

      const manifest = Updates.manifest;
      const isEmbedded = Updates.isEmbeddedLaunch;

      if (!manifest || isEmbedded) {
        return {
          updateId: null,
          runtimeVersion: Updates.runtimeVersion ?? 'unknown',
          channel: this.config.channelKey,
          createdAt: null,
          isEmbedded: true,
        };
      }

      // 从 manifest 提取信息
      const m = manifest as Record<string, unknown>;

      return {
        updateId: (m['id'] as string) ?? null,
        runtimeVersion:
          (m['runtimeVersion'] as string) ??
          Updates.runtimeVersion ??
          'unknown',
        channel: this.config.channelKey,
        createdAt: m['createdAt']
          ? new Date(m['createdAt'] as string)
          : null,
        isEmbedded: false,
      };
    } catch {
      // expo-updates 不可用
      return {
        updateId: null,
        runtimeVersion: 'unknown',
        channel: this.config.channelKey,
        createdAt: null,
        isEmbedded: true,
      };
    }
  }

  /**
   * 获取设备信息
   */
  async getDeviceInfo(): Promise<DeviceInfo> {
    return getDeviceInfo();
  }

  /**
   * 获取上次检查时间
   */
  async getLastCheckTime(): Promise<Date | null> {
    const timeStr = await Storage.getString(
      STORAGE_KEYS.LAST_CHECK_TIME
    );
    return timeStr ? new Date(timeStr) : null;
  }

  /**
   * 获取配置
   */
  getConfig(): Readonly<RapidPushConfig> {
    return this.config;
  }

  /**
   * 销毁实例
   */
  async destroy(): Promise<void> {
    await this.analytics.destroy();
  }

  /**
   * 获取运行时版本
   */
  private async getRuntimeVersion(): Promise<string> {
    // 优先使用配置的版本
    if (this.config.runtimeVersion) {
      return this.config.runtimeVersion;
    }

    try {
      // 从 expo-updates 获取
      const Updates = await import('expo-updates');
      if (Updates.runtimeVersion) {
        return Updates.runtimeVersion;
      }

      // 从 expo-constants 获取
      const Constants = await import('expo-constants');
      const expoConfig = Constants.default.expoConfig;
      if (expoConfig?.runtimeVersion) {
        if (typeof expoConfig.runtimeVersion === 'string') {
          return expoConfig.runtimeVersion;
        }
        // 可能是 policy 对象，取 version
        if (typeof expoConfig.runtimeVersion === 'object') {
          return expoConfig.version ?? 'unknown';
        }
      }

      // 使用 app version
      if (expoConfig?.version) {
        return expoConfig.version;
      }
    } catch {
      // 忽略
    }

    return 'unknown';
  }
}
