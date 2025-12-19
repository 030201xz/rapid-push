/**
 * useCurrentUpdate Hook
 *
 * 获取当前运行的更新信息
 */

import { useEffect, useState } from 'react';

import { useRapidPushContext } from '../provider/context';
import type { UseCurrentUpdateResult } from '../types';

/**
 * 当前更新信息 Hook
 */
export function useCurrentUpdate(): UseCurrentUpdateResult {
  const { sdk } = useRapidPushContext();

  const [info, setInfo] = useState<UseCurrentUpdateResult>({
    updateId: null,
    runtimeVersion: 'unknown',
    channel: null,
    createdAt: null,
    isEmbedded: true,
  });

  useEffect(() => {
    // 获取当前更新信息
    sdk.getCurrentUpdate().then(setInfo).catch(console.warn);
  }, [sdk]);

  return info;
}
