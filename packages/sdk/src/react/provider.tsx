/**
 * RapidS Provider
 *
 * 提供全局状态管理和配置
 * 不捕获错误，让原始错误直接抛出以便调试
 */

import React, { useCallback, useEffect, useMemo, useReducer, useRef } from 'react';

import {
  Updater,
  configureAnalytics,
  trackCheckEvent,
  trackDownloadStart,
  trackDownloadComplete,
  flushAnalytics,
  DismissedUpdates,
  setLastCheckTime,
} from '../core';
import type { RapidSConfig, RapidSProviderProps, UpdaterError } from '../types/config';
import type { UpdaterState, UpdaterActions } from '../types/state';
import type { Manifest, Directive } from '../types/server';
import { RapidSContext, type RapidSContextValue } from './context';

// ==================== 初始状态 ====================

const initialState: UpdaterState = { status: 'idle' };

// ==================== Action 类型 ====================

type UpdaterAction =
  | { type: 'CHECK_START' }
  | { type: 'CHECK_SUCCESS'; manifest: Manifest }
  | { type: 'CHECK_NO_UPDATE' }
  | { type: 'CHECK_ROLLBACK'; directive: Directive }
  | { type: 'CHECK_ERROR'; error: UpdaterError }
  | { type: 'DOWNLOAD_START'; manifest: Manifest }
  | { type: 'DOWNLOAD_PROGRESS'; progress: number; manifest: Manifest }
  | { type: 'DOWNLOAD_SUCCESS'; manifest: Manifest }
  | { type: 'DOWNLOAD_ERROR'; error: UpdaterError }
  | { type: 'APPLY_START'; manifest: Manifest }
  | { type: 'APPLY_ERROR'; error: UpdaterError }
  | { type: 'DISMISS' }
  | { type: 'CLEAR_ERROR' };

// ==================== Reducer ====================

function updaterReducer(state: UpdaterState, action: UpdaterAction): UpdaterState {
  switch (action.type) {
    case 'CHECK_START':
      return { status: 'checking' };

    case 'CHECK_SUCCESS':
      return { status: 'available', manifest: action.manifest };

    case 'CHECK_NO_UPDATE':
      return { status: 'idle' };

    case 'CHECK_ROLLBACK':
      return { status: 'rollback', directive: action.directive };

    case 'CHECK_ERROR':
      return { status: 'error', error: action.error };

    case 'DOWNLOAD_START':
      return { status: 'downloading', progress: 0, manifest: action.manifest };

    case 'DOWNLOAD_PROGRESS':
      return { status: 'downloading', progress: action.progress, manifest: action.manifest };

    case 'DOWNLOAD_SUCCESS':
      return { status: 'ready', manifest: action.manifest };

    case 'DOWNLOAD_ERROR':
      return { status: 'error', error: action.error };

    case 'APPLY_START':
      return { status: 'applying', manifest: action.manifest };

    case 'APPLY_ERROR':
      return { status: 'error', error: action.error };

    case 'DISMISS':
      return { status: 'idle' };

    case 'CLEAR_ERROR':
      return { status: 'idle' };

    default:
      return state;
  }
}

// ==================== Provider 组件 ====================

/**
 * RapidS Provider 组件
 *
 * 在应用根部使用，提供热更新功能
 */
export function RapidSProvider({
  children,
  channelKey,
  serverUrl,
  checkOnMount = true,
  checkInterval = 0,
  enableAnalytics = true,
  deviceId,
  customHeaders,
  onUpdateAvailable,
  onUpdateDownloaded,
  // onRollback,
  // onError - 不再使用，错误直接抛出
}: RapidSProviderProps): React.ReactElement {
  const [state, dispatch] = useReducer(updaterReducer, initialState);
  const checkIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const currentManifestRef = useRef<Manifest | null>(null);

  // 配置对象 - 使用条件展开构建，只在有值时包含可选属性（符合 exactOptionalPropertyTypes）
  const config = useMemo(
    (): RapidSConfig => ({
      channelKey,
      checkOnMount,
      checkInterval,
      enableAnalytics,
      ...(serverUrl != null && { serverUrl }),
      ...(deviceId != null && { deviceId }),
      ...(customHeaders != null && { customHeaders }),
    }),
    [channelKey, serverUrl, checkOnMount, checkInterval, enableAnalytics, deviceId, customHeaders],
  );

  // 初始化统计模块
  useEffect(() => {
    if (serverUrl && enableAnalytics) {
      configureAnalytics({
        serverUrl,
        channelKey,
        enabled: enableAnalytics,
      });
    }
  }, [serverUrl, channelKey, enableAnalytics]);

  // ==================== 操作方法 ====================

  const checkForUpdate = useCallback(async (): Promise<Manifest | null> => {
    console.log('[RapidS] checkForUpdate 开始');

    // 开发模式下 expo-updates 不可用，抛出明确错误
    if (!Updater.isAvailable()) {
      const error: UpdaterError = {
        code: 'NOT_AVAILABLE',
        message: 'expo-updates 在开发模式下不可用，请使用发布版本测试热更新功能',
      };
      console.error('[RapidS] expo-updates 不可用:', error.message);
      dispatch({ type: 'CHECK_ERROR', error });
      throw new Error(error.message);
    }

    dispatch({ type: 'CHECK_START' });
    console.log('[RapidS] 状态已更新为 checking');

    try {
      // 统计事件不阻塞主流程，异步执行
      trackCheckEvent().catch((e) => console.warn('[RapidS] trackCheckEvent 失败:', e));

      console.log('[RapidS] 调用 Updater.checkForUpdate...');
      const manifest = await Updater.checkForUpdate();
      console.log('[RapidS] checkForUpdate 返回:', manifest ? '有更新' : '无更新');

      if (!manifest) {
        dispatch({ type: 'CHECK_NO_UPDATE' });
        return null;
      }

      // 检查是否已忽略
      const isDismissed = await DismissedUpdates.isDismissed(manifest.id);
      if (isDismissed) {
        console.log('[RapidS] 更新已被忽略:', manifest.id);
        dispatch({ type: 'CHECK_NO_UPDATE' });
        return null;
      }

      currentManifestRef.current = manifest;
      dispatch({ type: 'CHECK_SUCCESS', manifest });
      // 异步设置检查时间，不阻塞
      setLastCheckTime(new Date()).catch((e) =>
        console.warn('[RapidS] setLastCheckTime 失败:', e),
      );
      onUpdateAvailable?.(manifest);

      return manifest;
    } catch (error) {
      // 捕获所有错误，更新状态并记录日志
      const updaterError: UpdaterError = {
        code: 'CHECK_FAILED',
        message: error instanceof Error ? error.message : '检查更新时发生未知错误',
        cause: error instanceof Error ? error : undefined,
      };
      console.error('[RapidS] checkForUpdate 错误:', updaterError.message, error);
      dispatch({ type: 'CHECK_ERROR', error: updaterError });
      throw error;
    }
  }, [onUpdateAvailable]);

  const downloadUpdate = useCallback(async (): Promise<void> => {
    if (state.status !== 'available') {
      console.warn('[RapidS] downloadUpdate 调用时状态不是 available:', state.status);
      return;
    }

    const manifest = state.manifest;
    dispatch({ type: 'DOWNLOAD_START', manifest });
    console.log('[RapidS] 开始下载更新:', manifest.id);

    try {
      // 统计事件不阻塞主流程
      trackDownloadStart(manifest.id).catch((e) =>
        console.warn('[RapidS] trackDownloadStart 失败:', e),
      );

      await Updater.downloadUpdate((progress) => {
        dispatch({ type: 'DOWNLOAD_PROGRESS', progress, manifest });
      });

      // 统计事件不阻塞主流程
      trackDownloadComplete(manifest.id).catch((e) =>
        console.warn('[RapidS] trackDownloadComplete 失败:', e),
      );

      dispatch({ type: 'DOWNLOAD_SUCCESS', manifest });
      console.log('[RapidS] 下载完成:', manifest.id);
      onUpdateDownloaded?.(manifest);
    } catch (error) {
      const updaterError: UpdaterError = {
        code: 'DOWNLOAD_FAILED',
        message: error instanceof Error ? error.message : '下载更新时发生未知错误',
        cause: error instanceof Error ? error : undefined,
      };
      console.error('[RapidS] downloadUpdate 错误:', updaterError.message, error);
      dispatch({ type: 'DOWNLOAD_ERROR', error: updaterError });
      throw error;
    }
  }, [state, onUpdateDownloaded]);

  const applyUpdate = useCallback(async (): Promise<void> => {
    if (state.status !== 'ready') {
      console.warn('[RapidS] applyUpdate 调用时状态不是 ready:', state.status);
      return;
    }

    const manifest = state.manifest;
    dispatch({ type: 'APPLY_START', manifest });
    console.log('[RapidS] 开始应用更新:', manifest.id);

    try {
      // 刷新统计队列（不阻塞）
      flushAnalytics().catch((e) => console.warn('[RapidS] flushAnalytics 失败:', e));
      // 应用更新（会重启应用）
      await Updater.applyUpdate();
    } catch (error) {
      const updaterError: UpdaterError = {
        code: 'APPLY_FAILED',
        message: error instanceof Error ? error.message : '应用更新时发生未知错误',
        cause: error instanceof Error ? error : undefined,
      };
      console.error('[RapidS] applyUpdate 错误:', updaterError.message, error);
      dispatch({ type: 'APPLY_ERROR', error: updaterError });
      throw error;
    }
  }, [state]);

  const dismissUpdate = useCallback(
    (persistent = false): void => {
      if (state.status === 'available' && persistent) {
        DismissedUpdates.add(state.manifest.id);
      }
      dispatch({ type: 'DISMISS' });
    },
    [state],
  );

  const clearError = useCallback((): void => {
    dispatch({ type: 'CLEAR_ERROR' });
  }, []);

  // 操作对象
  const actions: UpdaterActions = useMemo(
    () => ({
      checkForUpdate,
      downloadUpdate,
      applyUpdate,
      dismissUpdate,
      clearError,
    }),
    [checkForUpdate, downloadUpdate, applyUpdate, dismissUpdate, clearError],
  );

  // ==================== 自动检查 ====================

  // 启动时检查
  useEffect(() => {
    if (checkOnMount && Updater.isAvailable()) {
      console.log('[RapidS] checkOnMount 触发自动检查更新');
      // 错误已在 checkForUpdate 内部处理并更新状态，这里只需 catch 防止未处理的 rejection
      checkForUpdate().catch(() => {
        // 错误已在 checkForUpdate 中处理，这里静默
      });
    }
  }, [checkOnMount, checkForUpdate]);

  // 定时检查
  useEffect(() => {
    if (checkInterval > 0 && Updater.isAvailable()) {
      console.log('[RapidS] 启用定时检查，间隔:', checkInterval, 'ms');
      checkIntervalRef.current = setInterval(() => {
        // 只在空闲状态时检查
        if (state.status === 'idle') {
          checkForUpdate().catch(() => {
            // 错误已在 checkForUpdate 中处理
          });
        }
      }, checkInterval);
    }

    return () => {
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
      }
    };
  }, [checkInterval, checkForUpdate, state.status]);

  // ==================== Context 值 ====================

  const contextValue: RapidSContextValue = useMemo(
    () => ({ config, state, actions }),
    [config, state, actions],
  );

  return <RapidSContext.Provider value={contextValue}>{children}</RapidSContext.Provider>;
}
