/**
 * RapidPush Context
 * 
 * 提供 SDK 实例和状态的 React Context
 */

import { createContext, useContext } from 'react';

import type { UpdateAction, UpdateState } from '../types';
import type { RapidPush } from '../core';

/** Context 值类型 */
export interface RapidPushContextValue {
  /** SDK 实例 */
  readonly sdk: RapidPush;

  /** 更新状态 */
  readonly state: UpdateState;

  /** 状态分发器 */
  readonly dispatch: React.Dispatch<UpdateAction>;
}

/** Context 实例 */
export const RapidPushContext = createContext<RapidPushContextValue | null>(null);

/**
 * 获取 RapidPush Context
 * 
 * @throws 如果在 Provider 外部使用
 */
export function useRapidPushContext(): RapidPushContextValue {
  const context = useContext(RapidPushContext);

  if (!context) {
    throw new Error(
      '[RapidPush] useRapidPushContext 必须在 RapidPushProvider 内部使用',
    );
  }

  return context;
}
