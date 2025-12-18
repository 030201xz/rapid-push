/**
 * 依赖注入令牌定义
 *
 * 使用 Symbol 作为注入令牌，确保类型安全和唯一性
 * 所有可注入的服务都需要在这里定义对应的令牌
 */

/** 基础设施层令牌 */
export const INFRA_TOKENS = {
  /** 日志服务 */
  Logger: Symbol.for('Logger'),

  /** 数据库连接 */
  Database: Symbol.for('Database'),

  /** 数据库连接管理器 */
  DatabaseConnection: Symbol.for('DatabaseConnection'),
} as const;

/** 用户模块令牌 */
export const USER_TOKENS = {
  /** 用户仓储 */
  UserRepository: Symbol.for('UserRepository'),

  /** 用户服务 */
  UserService: Symbol.for('UserService'),

  /** 密码策略 */
  PasswordStrategy: Symbol.for('PasswordStrategy'),
} as const;

/** 所有令牌聚合 */
export const TOKENS = {
  ...INFRA_TOKENS,
  ...USER_TOKENS,
} as const;

/** 令牌类型 */
export type TokenKey = keyof typeof TOKENS;
export type TokenValue = (typeof TOKENS)[TokenKey];
