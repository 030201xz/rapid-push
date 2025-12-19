/**
 * useUpdates Hook
 *
 * 提供更新检查、下载、应用的完整功能
 */

import { useCallback, useMemo } from 'react';

import type { Manifest, UseUpdatesResult } from '../types';
import { RESPONSE_TYPE } from '../types';
import { toRapidPushError } from '../utils';

import { useRapidPushContext } from '../provider/context';

/**
 * 更新管理 Hook
 *
 * 提供检查更新、下载、应用等功能
 */
export function useUpdates(): UseUpdatesResult {
  const { sdk, state, dispatch } = useRapidPushContext();

  // 检查更新
  const check = useCallback(async (): Promise<Manifest | null> => {
    dispatch({ type: 'CHECK_START' });

    try {
      const result = await sdk.checkForUpdate();

      if (result.type === RESPONSE_TYPE.UPDATE_AVAILABLE) {
        dispatch({ type: 'CHECK_SUCCESS', payload: result.manifest });
        return result.manifest;
      }

      dispatch({ type: 'CHECK_SUCCESS', payload: null });
      return null;
    } catch (error) {
      const rapidPushError = toRapidPushError(error);
      dispatch({ type: 'CHECK_ERROR', payload: rapidPushError });
      return null;
    }
  }, [sdk, dispatch]);

  // 下载更新
  const download = useCallback(async (): Promise<void> => {
    const manifest = state.available;
    if (!manifest) {
      throw toRapidPushError(new Error('没有可用更新'));
    }

    // 估算总大小
    const assets = [manifest.launchAsset, ...manifest.assets];
    const total = assets.length;

    dispatch({ type: 'DOWNLOAD_START', payload: { total } });

    try {
      await sdk.downloadUpdate(manifest, progress => {
        dispatch({
          type: 'DOWNLOAD_PROGRESS',
          payload: {
            downloaded: progress.downloaded,
            progress: progress.progress,
          },
        });
      });

      dispatch({ type: 'DOWNLOAD_SUCCESS', payload: manifest });
    } catch (error) {
      const rapidPushError = toRapidPushError(error);
      dispatch({ type: 'DOWNLOAD_ERROR', payload: rapidPushError });
      throw rapidPushError;
    }
  }, [sdk, state.available, dispatch]);

  // 应用更新
  const apply = useCallback(async (): Promise<never> => {
    return sdk.applyUpdate();
  }, [sdk]);

  // 回滚
  const rollback = useCallback(async (): Promise<never> => {
    return sdk.rollbackToEmbedded();
  }, [sdk]);

  // 忽略更新
  const dismiss = useCallback((): void => {
    if (state.available) {
      sdk.dismissUpdate(state.available.id).catch(console.warn);
    }
    dispatch({ type: 'DISMISS_UPDATE' });
  }, [sdk, state.available, dispatch]);

  // 清除错误
  const clearError = useCallback((): void => {
    dispatch({ type: 'CLEAR_ERROR' });
  }, [dispatch]);

  // 计算派生状态
  const isDownloading = state.download.status === 'downloading';
  const progress = isDownloading
    ? (state.download as { progress: number }).progress
    : 0;

  return useMemo(
    () => ({
      // 状态
      state,
      isChecking: state.checking,
      isDownloading,
      progress,
      available: state.available,
      pending: state.pending,
      error: state.error,

      // 操作
      check,
      download,
      apply,
      dismiss,
      rollback,
      clearError,
    }),
    [
      state,
      isDownloading,
      progress,
      check,
      download,
      apply,
      dismiss,
      rollback,
      clearError,
    ]
  );
}
