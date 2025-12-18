import type { LogLevel, LogLevelString, LogFormat } from '../core/types';
import { STRING_TO_LOG_LEVEL } from '../core/types';
import { detectPlatform } from './platform';

/**
 * 环境变量配置接口
 */
export interface EnvConfig {
  level?: LogLevel;
  format?: LogFormat;
  timestamp?: boolean;
  color?: boolean;
}

/**
 * 从环境变量读取配置
 */
export function loadEnvConfig(): EnvConfig {
  const platform = detectPlatform();
  const config: EnvConfig = {};

  if (platform === 'browser') {
    // 浏览器环境: 从 localStorage 或 URL 参数读取
    config.level = getBrowserLogLevel();
    config.format = parseLogFormat(getBrowserEnv('LOG_FORMAT'));
    config.timestamp = getBrowserEnv('LOG_TIMESTAMP') === 'true';
    config.color = getBrowserEnv('LOG_COLOR') !== 'false';
  } else {
    // Node/Bun 环境: 从 process.env 读取
    config.level = getNodeLogLevel();
    config.format = parseLogFormat(process.env.LOG_FORMAT);
    config.timestamp = process.env.LOG_TIMESTAMP !== 'false';
    config.color = process.env.LOG_COLOR !== 'false';
  }

  return config;
}

/**
 * 从浏览器环境获取日志级别
 */
function getBrowserLogLevel(): LogLevel | undefined {
  try {
    // 检查浏览器环境
    if (typeof (globalThis as any).window === 'undefined') {
      return undefined;
    }

    // 优先从 URL 参数读取
    const urlParams = new URLSearchParams((globalThis as any).window.location.search);
    const urlLevel = urlParams.get('LOG_LEVEL') || urlParams.get('log_level');
    if (urlLevel) {
      return parseLogLevel(urlLevel);
    }

    // 其次从 localStorage 读取
    const storageLevel = (globalThis as any).localStorage.getItem('LOG_LEVEL');
    if (storageLevel) {
      return parseLogLevel(storageLevel);
    }
  } catch (error) {
    // 忽略错误 (可能没有访问权限)
  }

  return undefined;
}

/**
 * 从浏览器环境获取配置项
 */
function getBrowserEnv(key: string): string | undefined {
  try {
    // 检查浏览器环境
    if (typeof (globalThis as any).window === 'undefined') {
      return undefined;
    }

    // 优先从 URL 参数读取
    const urlParams = new URLSearchParams((globalThis as any).window.location.search);
    const urlValue = urlParams.get(key) || urlParams.get(key.toLowerCase());
    if (urlValue) {
      return urlValue;
    }

    // 其次从 localStorage 读取
    return (globalThis as any).localStorage.getItem(key) || undefined;
  } catch (error) {
    return undefined;
  }
}

/**
 * 从 Node/Bun 环境获取日志级别
 */
function getNodeLogLevel(): LogLevel | undefined {
  const level = process.env.LOG_LEVEL || process.env.log_level;
  return level ? parseLogLevel(level) : undefined;
}

/**
 * 解析日志级别字符串
 */
function parseLogLevel(level: string): LogLevel | undefined {
  const normalized = level.toLowerCase() as LogLevelString;
  return STRING_TO_LOG_LEVEL[normalized];
}

/**
 * 解析日志格式字符串
 */
function parseLogFormat(format: string | undefined): LogFormat | undefined {
  if (!format) return undefined;
  const normalized = format.toLowerCase();
  if (normalized === 'pretty' || normalized === 'json' || normalized === 'compact') {
    return normalized as LogFormat;
  }
  return undefined;
}

/**
 * 设置浏览器环境配置
 */
export function setBrowserEnv(key: string, value: string): void {
  try {
    if (typeof (globalThis as any).localStorage !== 'undefined') {
      (globalThis as any).localStorage.setItem(key, value);
    }
  } catch (error) {
    console.warn(`Failed to set ${key} in localStorage:`, error);
  }
}

/**
 * 获取环境变量值
 */
export function getEnv(key: string, defaultValue?: string): string | undefined {
  const platform = detectPlatform();

  if (platform === 'browser') {
    return getBrowserEnv(key) || defaultValue;
  }

  return process.env[key] || defaultValue;
}
