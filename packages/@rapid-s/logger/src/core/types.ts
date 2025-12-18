/**
 * 日志级别枚举
 */
export enum LogLevel {
  TRACE = 0,
  DEBUG = 1,
  INFO = 2,
  WARN = 3,
  ERROR = 4,
  FATAL = 5,
  SILENT = 999,
}

/**
 * 日志级别字符串类型
 */
export type LogLevelString = 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal' | 'silent';

/**
 * 日志格式类型
 */
export type LogFormat = 'pretty' | 'json' | 'compact';

/**
 * 日志配置选项
 */
export interface LoggerOptions {
  /** 日志级别 */
  level?: LogLevel | LogLevelString;
  /** 输出格式 */
  format?: LogFormat;
  /** 是否显示时间戳 */
  timestamp?: boolean;
  /** 是否启用颜色 */
  color?: boolean;
  /** 命名空间 */
  namespace?: string;
  /** Pretty 输出时的列布局 */
  columns?: LogColumnSpec[];
}

/**
 * 日志上下文数据
 */
export type LogContext = Record<string, any>;

/**
 * 日志条目
 */
export interface LogEntry {
  level: LogLevel;
  message: string;
  context?: LogContext;
  timestamp: Date;
  namespace?: string;
}

/**
 * 列对齐方式
 */
export type LogColumnAlignment = 'left' | 'center' | 'right';

/**
 * 列渲染上下文
 */
export interface LogColumnRenderArgs {
  entry: LogEntry;
  levelName: string;
  formattedTimestamp?: string;
  supportsColor: boolean;
}

/**
 * 列渲染函数
 */
export type LogColumnRenderer = (args: LogColumnRenderArgs) => string | undefined;

/**
 * 列配置
 */
export interface LogColumnSpec {
  id: string;
  width?: number;
  align?: LogColumnAlignment;
  padding?: number;
  flex?: boolean;
  enabled?: boolean;
  render?: LogColumnRenderer;
}

/**
 * 颜色配置
 */
export interface ColorConfig {
  /** 背景颜色(HEX) */
  bg: string;
  /** 前景颜色(HEX) */
  fg: string;
  /** ANSI 颜色代码 */
  ansi: number;
  /** Badge emoji */
  badge: string;
}

/**
 * 日志级别映射到字符串
 */
export const LOG_LEVEL_NAMES: Record<LogLevel, string> = {
  [LogLevel.TRACE]: 'TRACE',
  [LogLevel.DEBUG]: 'DEBUG',
  [LogLevel.INFO]: 'INFO',
  [LogLevel.WARN]: 'WARN',
  [LogLevel.ERROR]: 'ERROR',
  [LogLevel.FATAL]: 'FATAL',
  [LogLevel.SILENT]: 'SILENT',
};

/**
 * 字符串映射到日志级别
 */
export const STRING_TO_LOG_LEVEL: Record<string, LogLevel> = {
  trace: LogLevel.TRACE,
  debug: LogLevel.DEBUG,
  info: LogLevel.INFO,
  warn: LogLevel.WARN,
  error: LogLevel.ERROR,
  fatal: LogLevel.FATAL,
  silent: LogLevel.SILENT,
};

/**
 * 导出常用的日志级别常量
 */
export const TRACE = LogLevel.TRACE;
export const DEBUG = LogLevel.DEBUG;
export const INFO = LogLevel.INFO;
export const WARN = LogLevel.WARN;
export const ERROR = LogLevel.ERROR;
export const FATAL = LogLevel.FATAL;
export const SILENT = LogLevel.SILENT;
