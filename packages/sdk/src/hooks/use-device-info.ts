/**
 * useDeviceInfo Hook
 * 
 * 获取设备信息
 */

import { useEffect, useState } from 'react';

import type { UseDeviceInfoResult } from '../types';
import { getDeviceInfo } from '../utils';

/**
 * 设备信息 Hook
 */
export function useDeviceInfo(): UseDeviceInfoResult {
  const [info, setInfo] = useState<UseDeviceInfoResult>({
    deviceId: '',
    platform: 'android',
    platformVersion: '',
  });

  useEffect(() => {
    getDeviceInfo().then(setInfo).catch(console.warn);
  }, []);

  return info;
}
