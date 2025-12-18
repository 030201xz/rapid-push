/**
 * 日志服务封装
 *
 * 基于 @x/logger 的封装，提供依赖注入支持
 */

import { createLogger } from '@x/logger';
import { loggerConfig } from '../../config';
import { injectable } from '../../core/di';

/** Logger 类型 - 从 createLogger 返回类型推导 */
export type Logger = ReturnType<typeof createLogger>;

/**
 * 创建应用日志实例
 *
 * 使用配置层的日志配置
 */
export function createAppLogger(namespace?: string): Logger {
  return createLogger({
    level: loggerConfig.level,
    format: loggerConfig.format as 'pretty' | 'json',
    color: loggerConfig.color,
    namespace,
  });
}

/** 默认应用日志实例 */
export const appLogger = createAppLogger('App');

/**
 * 可注入的日志服务
 *
 * 通过 DI 容器注入，支持命名空间
 */
@injectable()
export class LoggerService {
  private logger: Logger;

  constructor() {
    this.logger = createAppLogger('Service');
  }

  /** 创建子日志器 */
  child(namespace: string) {
    return this.logger.child(namespace);
  }

  /** trace 级别日志 */
  trace(message: string, data?: Record<string, unknown>): void {
    this.logger.trace(message, data);
  }

  /** debug 级别日志 */
  debug(message: string, data?: Record<string, unknown>): void {
    this.logger.debug(message, data);
  }

  /** info 级别日志 */
  info(message: string, data?: Record<string, unknown>): void {
    this.logger.info(message, data);
  }

  /** warn 级别日志 */
  warn(message: string, data?: Record<string, unknown>): void {
    this.logger.warn(message, data);
  }

  /** error 级别日志 */
  error(message: string, data?: Record<string, unknown>): void {
    this.logger.error(message, data);
  }

  /** fatal 级别日志 */
  fatal(message: string, data?: Record<string, unknown>): void {
    this.logger.fatal(message, data);
  }
}
