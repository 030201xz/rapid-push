/**
 * 协议类型定义
 *
 * 从服务端类型复用，确保前后端类型一致
 * 使用 type 关键字从服务端包导入类型
 */

// ==================== 从服务端复用的类型 ====================

import type {
  RouterInput,
  RouterOutput,
} from '@rapid-s/server/types';

/** 检查更新请求参数 - 从服务端 tRPC 路由推导 */
export type CheckUpdateRequest =
  RouterInput['hotUpdate']['protocol']['manifest']['check'];

/** 检查更新响应 - 从服务端 tRPC 路由推导 */
export type CheckUpdateResponse =
  RouterOutput['hotUpdate']['protocol']['manifest']['check'];

/** 统计上报请求参数 */
export type ReportAnalyticsRequest =
  RouterInput['hotUpdate']['protocol']['analytics']['report'];

/** 单个统计事件 */
export type AnalyticsEvent = ReportAnalyticsRequest['events'][number];

/** 统计事件类型 */
export type AnalyticsEventType = AnalyticsEvent['type'];

// ==================== 从响应类型提取的子类型 ====================

/**
 * Manifest 类型
 * 从 updateAvailable 响应中提取
 */
export type Manifest = Extract<
  CheckUpdateResponse,
  { type: 'updateAvailable' }
>['manifest'];

/**
 * ManifestAsset 类型
 * 从 Manifest 中提取
 */
export type ManifestAsset = Manifest['launchAsset'];

/**
 * Directive 类型
 * 从 rollback 响应中提取
 */
export type Directive = Extract<
  CheckUpdateResponse,
  { type: 'rollback' }
>['directive'];

/** 响应类型常量 */
export const RESPONSE_TYPE = {
  UPDATE_AVAILABLE: 'updateAvailable',
  NO_UPDATE: 'noUpdate',
  ROLLBACK: 'rollback',
} as const;

export type ResponseType =
  (typeof RESPONSE_TYPE)[keyof typeof RESPONSE_TYPE];

// ==================== SDK 扩展类型 ====================

/** 当前更新信息 */
export interface CurrentUpdateInfo {
  /** 更新 ID（嵌入版本为 null） */
  readonly updateId: string | null;

  /** 运行时版本 */
  readonly runtimeVersion: string;

  /** 渠道密钥 */
  readonly channel: string | null;

  /** 更新创建时间（嵌入版本为 null） */
  readonly createdAt: Date | null;

  /** 是否为嵌入版本（未应用任何热更新） */
  readonly isEmbedded: boolean;
}

/** 设备信息 */
export interface DeviceInfo {
  /** 设备 ID（用于灰度匹配） */
  readonly deviceId: string;

  /** 平台 */
  readonly platform: 'ios' | 'android';

  /** 平台版本 */
  readonly platformVersion: string;
}

// ==================== 错误类型 ====================

/** 错误代码枚举 */
export type RapidPushErrorCode =
  | 'NETWORK_ERROR' // 网络连接失败
  | 'SERVER_ERROR' // 服务端返回错误
  | 'SIGNATURE_INVALID' // 签名验证失败
  | 'DOWNLOAD_FAILED' // 资源下载失败
  | 'STORAGE_FULL' // 存储空间不足
  | 'APPLY_FAILED' // 应用更新失败
  | 'CONFIG_INVALID'; // 配置无效

/** SDK 错误 */
export interface RapidPushError {
  /** 错误代码 */
  readonly code: RapidPushErrorCode;

  /** 错误消息 */
  readonly message: string;

  /** 原始错误 */
  readonly cause?: Error;

  /** 是否可重试 */
  readonly retryable: boolean;
}
