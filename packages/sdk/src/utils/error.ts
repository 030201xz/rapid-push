/**
 * 错误处理工具
 *
 * 创建和转换 SDK 错误
 */

import type { RapidPushError, RapidPushErrorCode } from '../types';

/**
 * 错误代码到是否可重试的映射
 */
const RETRYABLE_ERRORS: Record<RapidPushErrorCode, boolean> = {
  NETWORK_ERROR: true,
  SERVER_ERROR: true,
  SIGNATURE_INVALID: false,
  DOWNLOAD_FAILED: true,
  STORAGE_FULL: false,
  APPLY_FAILED: false,
  CONFIG_INVALID: false,
};

/**
 * 创建 SDK 错误
 */
export function createError(
  code: RapidPushErrorCode,
  message: string,
  cause?: Error
): RapidPushError {
  return {
    code,
    message,
    cause,
    retryable: RETRYABLE_ERRORS[code],
  };
}

/**
 * 将未知错误转换为 SDK 错误
 */
export function toRapidPushError(error: unknown): RapidPushError {
  // 已经是 SDK 错误
  if (isRapidPushError(error)) {
    return error;
  }

  // Error 实例
  if (error instanceof Error) {
    // 网络错误检测
    if (
      error.name === 'TypeError' &&
      error.message.includes('Network request failed')
    ) {
      return createError('NETWORK_ERROR', '网络连接失败', error);
    }

    // 通用错误
    return createError('SERVER_ERROR', error.message, error);
  }

  // 未知类型
  return createError('SERVER_ERROR', String(error));
}

/**
 * 类型守卫：检查是否为 SDK 错误
 */
export function isRapidPushError(
  error: unknown
): error is RapidPushError {
  if (typeof error !== 'object' || error === null) {
    return false;
  }

  const obj = error as Record<string, unknown>;
  return (
    typeof obj['code'] === 'string' &&
    typeof obj['message'] === 'string' &&
    typeof obj['retryable'] === 'boolean'
  );
}

/**
 * 错误代码到中文消息的映射
 */
export const ERROR_MESSAGES: Record<RapidPushErrorCode, string> = {
  NETWORK_ERROR: '网络连接失败，请检查网络设置',
  SERVER_ERROR: '服务器错误，请稍后重试',
  SIGNATURE_INVALID: '更新签名验证失败，请联系管理员',
  DOWNLOAD_FAILED: '更新下载失败，请重试',
  STORAGE_FULL: '存储空间不足，请清理后重试',
  APPLY_FAILED: '更新应用失败',
  CONFIG_INVALID: 'SDK 配置无效',
};
