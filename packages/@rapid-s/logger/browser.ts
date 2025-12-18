/**
 * @x/logger - 通用跨平台日志库
 * 浏览器环境入口
 */

export { BrowserLogger, createLogger } from './src/platforms/browser';
export { LogLevel, type LogLevelString, type LogFormat, type LoggerOptions, type LogContext, type LogEntry } from './src/core/types';
export { detectPlatform, type Platform } from './src/utils/platform';
export { loadEnvConfig, getEnv, setBrowserEnv } from './src/utils/env';

// 默认导出
import logger from './src/platforms/browser';
export default logger;
