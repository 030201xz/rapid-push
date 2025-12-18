/**
 * 数据库管理器类型定义
 */

/** 数据库连接状态 */
export enum DatabaseStatus {
  DISCONNECTED = 'disconnected',
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  ERROR = 'error',
}

/** 连接统计信息 */
export interface ConnectionStats {
  /** 当前状态 */
  status: DatabaseStatus;
  /** 运行时间（毫秒） */
  uptime: number;
  /** 最后健康检查时间 */
  lastHealthCheck?: Date;
  /** 健康检查是否通过 */
  healthCheckPassed?: boolean;
}
