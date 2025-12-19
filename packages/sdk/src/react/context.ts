/**
 * RapidS Context 定义
 *
 * 分离 Context 定义，避免循环依赖
 */

import { createContext, useContext } from 'react';

import type { RapidSConfig,
  //  UpdaterError
   } from '../types/config';
import type { UpdaterState, UpdaterActions } from '../types/state';
// import type { Manifest, Directive } from '../types/server';

// ==================== Context 值类型 ====================

/**
 * RapidS Context 值
 */
export interface RapidSContextValue {
  /** 配置 */
  config: RapidSConfig;
  /** 当前状态 */
  state: UpdaterState;
  /** 操作方法 */
  actions: UpdaterActions;
}

// ==================== Context 创建 ====================

/**
 * RapidS Context
 */
export const RapidSContext = createContext<RapidSContextValue | null>(null);

// ==================== Hook ====================

/**
 * 获取 RapidS Context
 *
 * @throws 如果在 RapidSProvider 外使用
 */
export function useRapidSContext(): RapidSContextValue {
  const context = useContext(RapidSContext);

  if (!context) {
    throw new Error('useRapidSContext must be used within a RapidSProvider');
  }

  return context;
}
