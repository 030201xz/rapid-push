/**
 * RapidS Provider
 *
 * 提供全局状态管理和配置
 */

import React, { useCallback, useEffect, useMemo, useReducer, useRef } from 'react';

import {
  Updater,
  configureAnalytics,
  trackCheckEvent,
  trackDownloadStart,
  trackDownloadComplete,
  trackDownloadFailed,
  trackApplyFailed,
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
  onError,
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
    if (!Updater.isAvailable()) {
      return null;
    }

    dispatch({ type: 'CHECK_START' });

    try {
      await trackCheckEvent();
      const manifest = await Updater.checkForUpdate();

      if (!manifest) {
        dispatch({ type: 'CHECK_NO_UPDATE' });
        return null;
      }

      // 检查是否已忽略
      const isDismissed = await DismissedUpdates.isDismissed(manifest.id);
      if (isDismissed) {
        dispatch({ type: 'CHECK_NO_UPDATE' });
        return null;
      }

      currentManifestRef.current = manifest;
      dispatch({ type: 'CHECK_SUCCESS', manifest });
      await setLastCheckTime(new Date());
      onUpdateAvailable?.(manifest);

      return manifest;
    } catch (error) {
      const updaterError: UpdaterError = {
        code: 'CHECK_FAILED',
        message: '检查更新失败',
        cause: error,
      };
      dispatch({ type: 'CHECK_ERROR', error: updaterError });
      onError?.(updaterError);
      return null;
    }
  }, [onUpdateAvailable, onError]);

  const downloadUpdate = useCallback(async (): Promise<void> => {
    if (state.status !== 'available') {
      return;
    }

    const manifest = state.manifest;
    dispatch({ type: 'DOWNLOAD_START', manifest });

    try {
      await trackDownloadStart(manifest.id);

      await Updater.downloadUpdate((progress) => {
        dispatch({ type: 'DOWNLOAD_PROGRESS', progress, manifest });
      });

      await trackDownloadComplete(manifest.id);
      dispatch({ type: 'DOWNLOAD_SUCCESS', manifest });
      onUpdateDownloaded?.(manifest);
    } catch (error) {
      const updaterError: UpdaterError = {
        code: 'DOWNLOAD_FAILED',
        message: '下载更新失败',
        cause: error,
      };
      await trackDownloadFailed(manifest.id, String(error));
      dispatch({ type: 'DOWNLOAD_ERROR', error: updaterError });
      onError?.(updaterError);
    }
  }, [state, onUpdateDownloaded, onError]);

  const applyUpdate = useCallback(async (): Promise<void> => {
    if (state.status !== 'ready') {
      return;
    }

    const manifest = state.manifest;
    dispatch({ type: 'APPLY_START', manifest });

    try {
      // 刷新统计队列
      await flushAnalytics();
      // 应用更新（会重启应用）
      await Updater.applyUpdate();
    } catch (error) {
      const updaterError: UpdaterError = {
        code: 'APPLY_FAILED',
        message: '应用更新失败',
        cause: error,
      };
      await trackApplyFailed(manifest.id, String(error));
      dispatch({ type: 'APPLY_ERROR', error: updaterError });
      onError?.(updaterError);
    }
  }, [state, onError]);

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
      checkForUpdate();
    }
  }, [checkOnMount, checkForUpdate]);

  // 定时检查
  useEffect(() => {
    if (checkInterval > 0 && Updater.isAvailable()) {
      checkIntervalRef.current = setInterval(() => {
        // 只在空闲状态时检查
        if (state.status === 'idle') {
          checkForUpdate();
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
