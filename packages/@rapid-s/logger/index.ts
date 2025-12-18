/**
 * @x/logger - 通用跨平台日志库
 * 主入口 (Node/Bun 终端环境)
 * 浏览器环境请使用: import logger from '@x/logger/browser'
 */

export { NodeLogger, createLogger } from './src/platforms/node';
export { LogLevel, type LogLevelString, type LogFormat, type LoggerOptions, type LogContext, type LogEntry } from './src/core/types';
export { detectPlatform, supportsColor, type Platform } from './src/utils/platform';
export { loadEnvConfig, getEnv, setBrowserEnv } from './src/utils/env';

// 默认导出
import logger from './src/platforms/node';
export default logger;
