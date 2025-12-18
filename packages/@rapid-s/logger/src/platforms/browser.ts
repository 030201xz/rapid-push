import { BaseLogger } from '../core/logger';
import type { LoggerOptions, LogEntry, LogContext } from '../core/types';
import { LOG_LEVEL_NAMES } from '../core/types';
import { LEVEL_COLORS } from '../core/colors';
import { loadEnvConfig } from '../utils/env';

/**
 * 浏览器平台 Logger 实现
 */
export class BrowserLogger extends BaseLogger {
  constructor(options: LoggerOptions = {}) {
    // 合并环境变量配置
    const envConfig = loadEnvConfig();
    const mergedOptions: LoggerOptions = {
      ...envConfig,
      ...options,
    };
    super(mergedOptions);
  }

  /**
   * 输出日志到浏览器控制台
   */
  protected write(entry: LogEntry): void {
    const { level, message, context, timestamp } = entry;

    if (this.format === 'json') {
      this.writeJson(entry);
      return;
    }

    const parts: string[] = [];
    const styles: string[] = [];

    // Badge 样式
    const colorConfig = LEVEL_COLORS[level];
    const levelName = LOG_LEVEL_NAMES[level];

    if (this.color) {
      parts.push(`%c ${colorConfig.badge} ${levelName} `);
      styles.push(
        `background: ${colorConfig.bg}; color: ${colorConfig.fg}; font-weight: bold; padding: 2px 6px; border-radius: 3px;`
      );
    } else {
      parts.push(`[${levelName}]`);
    }

    // 时间戳
    if (this.timestamp) {
      const timeStr = this.formatTimestamp(timestamp);
      if (this.color) {
        parts.push('%c' + timeStr);
        styles.push('color: #999; font-weight: normal;');
      } else {
        parts.push(timeStr);
      }
    }

    // 命名空间
    if (this.namespace) {
      if (this.color) {
        parts.push(`%c[${this.namespace}]`);
        styles.push('color: #0ea5e9; font-weight: bold;');
      } else {
        parts.push(`[${this.namespace}]`);
      }
    }

    // 消息内容
    if (this.color) {
      parts.push('%c' + message);
      styles.push('color: inherit; font-weight: normal;');
    } else {
      parts.push(message);
    }

    const logMessage = parts.join(' ');

    // 使用对应的 console 方法
    const consoleMethod = this.getConsoleMethod(level);

    if (context) {
      consoleMethod(logMessage, ...styles, context);
    } else {
      consoleMethod(logMessage, ...styles);
    }
  }

  /**
   * 输出 JSON 格式日志
   */
  private writeJson(entry: LogEntry): void {
    const jsonLog = {
      level: LOG_LEVEL_NAMES[entry.level],
      message: entry.message,
      timestamp: entry.timestamp.toISOString(),
      ...(entry.namespace && { namespace: entry.namespace }),
      ...(entry.context && { context: entry.context }),
    };

    console.log(JSON.stringify(jsonLog));
  }

  /**
   * 获取对应的 console 方法
   */
  private getConsoleMethod(level: number): (...args: any[]) => void {
    if (level >= 5) return console.error.bind(console); // FATAL
    if (level >= 4) return console.error.bind(console); // ERROR
    if (level >= 3) return console.warn.bind(console);  // WARN
    if (level >= 2) return console.info.bind(console);  // INFO
    if (level >= 1) return console.debug.bind(console); // DEBUG
    return console.trace.bind(console); // TRACE
  }

  /**
   * 创建子 logger
   */
  protected createChild(options: LoggerOptions): BaseLogger {
    return new BrowserLogger(options);
  }
}

/**
 * 创建默认浏览器 logger 实例
 */
export function createLogger(options?: LoggerOptions): BrowserLogger {
  return new BrowserLogger(options);
}

/**
 * 默认导出 logger 实例
 */
const logger = createLogger();
export default logger;
