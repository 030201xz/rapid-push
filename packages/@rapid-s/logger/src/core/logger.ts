import type {
  LogLevelString,
  LogFormat,
  LoggerOptions,
  LogContext,
  LogEntry,
  LogColumnSpec,
} from './types';
import { 
  STRING_TO_LOG_LEVEL, 
  LogLevel, 
  INFO, 
  TRACE, 
  DEBUG, 
  WARN, 
  ERROR, 
  FATAL 
} from './types';
/**
 * Logger 抽象基类
 */
export abstract class BaseLogger {
  protected level: LogLevel;
  protected format: LogFormat;
  protected timestamp: boolean;
  protected color: boolean;
  protected namespace?: string;
  protected columns?: LogColumnSpec[];

  constructor(options: LoggerOptions = {}) {
    this.level = this.parseLevel(options.level ?? 'info');
    this.format = options.format ?? 'pretty';
    this.timestamp = options.timestamp ?? true;
    this.color = options.color ?? true;
    this.namespace = options.namespace;
    this.columns = options.columns;
  }

  /**
   * 解析日志级别
   */
  protected parseLevel(level: LogLevel | LogLevelString): LogLevel {
    if (typeof level === 'number') {
      return level;
    }
    const parsed = STRING_TO_LOG_LEVEL[level.toLowerCase()];
    return parsed !== undefined ? parsed : INFO;
  }

  /**
   * 判断是否应该输出日志
   */
  protected shouldLog(level: LogLevel): boolean {
    return level >= this.level;
  }

  /**
   * 创建日志条目
   */
  protected createLogEntry(level: LogLevel, message: string, context?: LogContext): LogEntry {
    return {
      level,
      message,
      context,
      timestamp: new Date(),
      namespace: this.namespace,
    };
  }

  /**
   * 格式化时间戳
   */
  protected formatTimestamp(date: Date): string {
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const seconds = date.getSeconds().toString().padStart(2, '0');
    const ms = date.getMilliseconds().toString().padStart(3, '0');
    return `${hours}:${minutes}:${seconds}.${ms}`;
  }

  /**
   * 抽象方法: 输出日志
   */
  protected abstract write(entry: LogEntry): void;

  /**
   * 通用日志方法
   */
  protected log(level: LogLevel, message: string, contextOrError?: LogContext | Error | unknown): void {
    if (!this.shouldLog(level)) {
      return;
    }

    // 处理 Error 对象或 unknown 类型
    let context: LogContext | undefined;
    if (contextOrError instanceof Error) {
      context = {
        error: {
          name: contextOrError.name,
          message: contextOrError.message,
          stack: contextOrError.stack,
        },
      };
    } else if (contextOrError !== undefined && contextOrError !== null && typeof contextOrError === 'object') {
      // 如果是对象但不是 Error，尝试作为 LogContext 处理
      if ('name' in contextOrError || 'message' in contextOrError || 'stack' in contextOrError) {
        // 看起来像 Error 对象，转换为标准格式
        context = {
          error: {
            name: (contextOrError as any).name || 'Error',
            message: (contextOrError as any).message || String(contextOrError),
            stack: (contextOrError as any).stack,
          },
        };
      } else {
        context = contextOrError as LogContext;
      }
    } else if (contextOrError !== undefined && contextOrError !== null) {
      // 其他类型，转换为字符串
      context = {
        error: String(contextOrError),
      };
    }

    const entry = this.createLogEntry(level, message, context);
    this.write(entry);
  }

  /**
   * TRACE 级别日志
   */
  trace(message: string, contextOrError?: LogContext | Error | unknown): void {
    this.log(TRACE, message, contextOrError);
  }

  /**
   * DEBUG 级别日志
   */
  debug(message: string, contextOrError?: LogContext | Error | unknown): void {
    this.log(DEBUG, message, contextOrError);
  }

  /**
   * INFO 级别日志
   */
  info(message: string, contextOrError?: LogContext | Error | unknown): void {
    this.log(INFO, message, contextOrError);
  }

  /**
   * WARN 级别日志
   */
  warn(message: string, contextOrError?: LogContext | Error | unknown): void {
    this.log(WARN, message, contextOrError);
  }

  /**
   * ERROR 级别日志
   */
  error(message: string, contextOrError?: LogContext | Error | unknown): void {
    this.log(ERROR, message, contextOrError);
  }

  /**
   * FATAL 级别日志
   */
  fatal(message: string, contextOrError?: LogContext | Error | unknown): void {
    this.log(FATAL, message, contextOrError);
  }

  /**
   * 设置日志级别
   */
  setLevel(level: LogLevel | LogLevelString): void {
    this.level = this.parseLevel(level);
  }

  /**
   * 配置 logger
   */
  configure(options: LoggerOptions): void {
    if (options.level !== undefined) {
      this.level = this.parseLevel(options.level);
    }
    if (options.format !== undefined) {
      this.format = options.format;
    }
    if (options.timestamp !== undefined) {
      this.timestamp = options.timestamp;
    }
    if (options.color !== undefined) {
      this.color = options.color;
    }
    if (options.namespace !== undefined) {
      this.namespace = options.namespace;
    }
    if (options.columns !== undefined) {
      this.columns = options.columns;
    }
  }

  /**
   * 创建子 logger (带命名空间)
   */
  child(namespace: string): BaseLogger {
    const childNamespace = this.namespace ? `${this.namespace}:${namespace}` : namespace;
    return this.createChild({ ...this.getOptions(), namespace: childNamespace });
  }

  /**
   * 获取当前配置
   */
  protected getOptions(): LoggerOptions {
    return {
      level: this.level,
      format: this.format,
      timestamp: this.timestamp,
      color: this.color,
      namespace: this.namespace,
      columns: this.columns,
    };
  }

  /**
   * 抽象方法: 创建子 logger
   */
  protected abstract createChild(options: LoggerOptions): BaseLogger;

  /**
   * 性能计时开始
   */
  time(label: string): void {
    const key = this.namespace ? `${this.namespace}:${label}` : label;
    console.time(key);
  }

  /**
   * 性能计时结束
   */
  timeEnd(label: string): void {
    const key = this.namespace ? `${this.namespace}:${label}` : label;
    console.timeEnd(key);
  }

  /**
   * 分组开始
   */
  group(title: string): void {
    console.group(title);
  }

  /**
   * 分组结束
   */
  groupEnd(): void {
    console.groupEnd();
  }
}
