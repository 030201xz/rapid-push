/**
 * useUpdateInfo Hook
 *
 * 获取当前运行的更新信息
 */

import { useEffect, useState } from 'react';

import { Updater, getLastCheckTime } from '../../core';
import { useRapidSContext } from '../context';
import type { UseUpdateInfoResult } from '../../types/state';

/**
 * 获取当前更新信息
 *
 * @example
 * ```tsx
 * function VersionInfo() {
 *   const { runtimeVersion, isEmbedded, updateId } = useUpdateInfo();
 *
 *   return (
 *     <View>
 *       <Text>版本: {runtimeVersion}</Text>
 *       <Text>更新: {isEmbedded ? '内置版本' : updateId?.slice(0, 8)}</Text>
 *     </View>
 *   );
 * }
 * ```
 */
export function useUpdateInfo(): UseUpdateInfoResult {
  const { config, state } = useRapidSContext();
  const [lastCheckTime, setLastCheckTime] = useState<Date | null>(null);

  // 获取上次检查时间
  useEffect(() => {
    getLastCheckTime().then(setLastCheckTime);
  }, [state]);

  const currentUpdate = Updater.getCurrentUpdate();

  // 判断是否有待应用的更新
  const hasPendingUpdate = state.status === 'ready';

  return {
    updateId: currentUpdate.updateId,
    runtimeVersion: currentUpdate.runtimeVersion,
    channelKey: config.channelKey,
    createdAt: currentUpdate.createdAt,
    isEmbedded: currentUpdate.isEmbedded,
    lastCheckTime,
    hasPendingUpdate,
  };
}
