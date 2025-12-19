/**
 * RapidPush Provider
 * 
 * 包装应用，提供热更新功能
 */

import React, {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
} from 'react';

import type { Manifest, RapidPushProviderProps } from '../types';
import { INITIAL_UPDATE_STATE, RESPONSE_TYPE, updateReducer } from '../types';
import { RapidPush } from '../core';
import { toRapidPushError } from '../utils';

import { RapidPushContext, type RapidPushContextValue } from './context';

/**
 * RapidPush Provider 组件
 */
export function RapidPushProvider({
  config,
  children,
  autoCheck,
  onUpdateAvailable,
  onUpdateDownloaded,
  onError,
}: RapidPushProviderProps): React.JSX.Element {
  // 状态管理
  const [state, dispatch] = useReducer(updateReducer, INITIAL_UPDATE_STATE);

  // SDK 实例（使用 ref 避免重新创建）
  const sdkRef = useRef<RapidPush | null>(null);

  // 延迟初始化 SDK
  if (!sdkRef.current) {
    sdkRef.current = RapidPush.create(config);
  }

  const sdk = sdkRef.current;

  // 定时检查引用
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // 检查更新函数
  const checkForUpdate = useCallback(async (): Promise<Manifest | null> => {
    dispatch({ type: 'CHECK_START' });

    try {
      const result = await sdk.checkForUpdate();

      if (result.type === RESPONSE_TYPE.UPDATE_AVAILABLE) {
        dispatch({ type: 'CHECK_SUCCESS', payload: result.manifest });
        onUpdateAvailable?.(result.manifest);
        return result.manifest;
      }

      dispatch({ type: 'CHECK_SUCCESS', payload: null });
      return null;
    } catch (error) {
      const rapidPushError = toRapidPushError(error);
      dispatch({ type: 'CHECK_ERROR', payload: rapidPushError });
      onError?.(rapidPushError);
      return null;
    }
  }, [sdk, onUpdateAvailable, onError]);

  // 初始化
  useEffect(() => {
    sdk.initialize().catch(console.warn);

    return () => {
      sdk.destroy().catch(console.warn);
    };
  }, [sdk]);

  // 启动时检查
  useEffect(() => {
    if (autoCheck?.onMount) {
      checkForUpdate().catch(console.warn);
    }
  }, [autoCheck?.onMount, checkForUpdate]);

  // 定时检查
  useEffect(() => {
    const interval = autoCheck?.interval;

    if (interval && interval > 0) {
      intervalRef.current = setInterval(() => {
        checkForUpdate().catch(console.warn);
      }, interval);

      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      };
    }
  }, [autoCheck?.interval, checkForUpdate]);

  // 监听下载完成
  useEffect(() => {
    if (state.pending && onUpdateDownloaded) {
      onUpdateDownloaded(state.pending);
    }
  }, [state.pending, onUpdateDownloaded]);

  // 构建 Context 值
  const contextValue = useMemo<RapidPushContextValue>(
    () => ({
      sdk,
      state,
      dispatch,
    }),
    [sdk, state],
  );

  return (
    <RapidPushContext.Provider value={contextValue}>
      {children}
    </RapidPushContext.Provider>
  );
}
