/**
 * 渠道配置汇总
 */

import type { ChannelConfig } from '../types';
import { productionChannel, stagingChannel } from './demo';

/** 所有渠道配置 */
export const channels: ChannelConfig[] = [
  productionChannel,
  stagingChannel,
  // 扩展时在此添加更多渠道
];

export { productionChannel, stagingChannel };
