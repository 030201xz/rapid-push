/**
 * @x/logger - 通用跨平台日志库
 * Node.js/Bun 终端环境入口
 */

export { NodeLogger, createLogger } from './platforms/node';
export {
  LogLevel,
  type LogLevelString,
  type LogFormat,
  type LoggerOptions,
  type LogContext,
  type LogEntry,
  type LogColumnSpec,
  type LogColumnAlignment,
  type LogColumnRenderArgs,
  type LogColumnRenderer,
} from './core/types';
export { detectPlatform, supportsColor } from './utils/platform';
export { loadEnvConfig, getEnv, setBrowserEnv } from './utils/env';

// 默认导出
import logger from './platforms/node';
export default logger;
