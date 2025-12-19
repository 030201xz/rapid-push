/**
 * 生产环境渠道配置
 */

import type { ChannelConfig } from '../types';

/** 生产环境渠道 */
export const productionChannel: ChannelConfig = {
  key: 'PRODUCTION',
  projectKey: 'DEMO_PROJECT',
  name: 'production',
  description: '生产环境 - 正式发布使用',
  signingEnabled: false,
  isDeleted: false,
  // 预定义渠道密钥，便于测试（生产环境应自动生成）
  presetChannelKey: 'prod_demo_app_channel_key_12345678',
};

/** 预发布环境渠道 */
export const stagingChannel: ChannelConfig = {
  key: 'STAGING',
  projectKey: 'DEMO_PROJECT',
  name: 'staging',
  description: '预发布环境 - 测试验证使用',
  signingEnabled: false,
  isDeleted: false,
  presetChannelKey: 'stage_demo_app_channel_key_87654321',
};
