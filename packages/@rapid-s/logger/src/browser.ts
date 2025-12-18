/**
 * @x/logger - 通用跨平台日志库
 * 浏览器环境入口
 */

export { BrowserLogger, createLogger } from './platforms/browser';
export { LogLevel, type LogLevelString, type LogFormat, type LoggerOptions, type LogContext, type LogEntry } from './core/types';
export { detectPlatform } from './utils/platform';
export { loadEnvConfig, getEnv, setBrowserEnv } from './utils/env';

// 默认导出
import logger from './platforms/browser';
export default logger;
