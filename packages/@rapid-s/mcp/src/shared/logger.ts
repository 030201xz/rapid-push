/** 日志级别 */
export enum LogLevel {
  Debug = 0,
  Info = 1,
  Warn = 2,
  Error = 3,
  Silent = 4,
}

/** 日志级别配置（可通过环境变量控制） */
const LOG_LEVEL = parseLogLevel(process.env["MCP_LOG_LEVEL"]);

function parseLogLevel(value: string | undefined): LogLevel {
  switch (value?.toLowerCase()) {
    case "debug":
      return LogLevel.Debug;
    case "info":
      return LogLevel.Info;
    case "warn":
      return LogLevel.Warn;
    case "error":
      return LogLevel.Error;
    case "silent":
      return LogLevel.Silent;
    default:
      return LogLevel.Info;
  }
}

/**
 * MCP 日志工具
 * 所有输出都写入 stderr，避免干扰 MCP 协议通信
 *
 * 注意：VS Code MCP 客户端会自动添加时间戳和前缀，
 * 所以这里只输出简洁的 [scope] message 格式
 */
export class Logger {
  constructor(private readonly scope: string) {}

  /** 调试日志 */
  debug(message: string, ...args: unknown[]): void {
    if (LOG_LEVEL <= LogLevel.Debug) {
      console.error(`[${this.scope}] ${message}`, ...args);
    }
  }

  /** 信息日志 */
  info(message: string, ...args: unknown[]): void {
    if (LOG_LEVEL <= LogLevel.Info) {
      console.error(`[${this.scope}] ${message}`, ...args);
    }
  }

  /** 警告日志 */
  warn(message: string, ...args: unknown[]): void {
    if (LOG_LEVEL <= LogLevel.Warn) {
      console.error(`[${this.scope}] ${message}`, ...args);
    }
  }

  /** 错误日志 */
  error(message: string, ...args: unknown[]): void {
    if (LOG_LEVEL <= LogLevel.Error) {
      console.error(`[${this.scope}] ${message}`, ...args);
    }
  }

  /** 创建子 Logger */
  child(subScope: string): Logger {
    return new Logger(`${this.scope}:${subScope}`);
  }
}

/** 创建指定作用域的 Logger */
export function createLogger(scope: string): Logger {
  return new Logger(scope);
}

/** 全局 Logger */
export const logger = createLogger("mcp");
