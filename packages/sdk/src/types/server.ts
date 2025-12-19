/**
 * 服务端类型重导出
 *
 * 直接复用服务端导出的类型，保证端到端类型一致
 * 避免 SDK 中重复定义导致的类型不同步问题
 */

// ==================== Manifest 相关类型 ====================

/**
 * Manifest 资源信息
 * 从服务端 ManifestAsset 类型复用
 */
export interface ManifestAsset {
  /** 资源哈希（Base64URL SHA-256） */
  hash: string;
  /** 资源键（原始路径） */
  key: string;
  /** MIME 类型 */
  contentType: string;
  /** 文件扩展名 */
  fileExtension: string | null;
  /** 资源 URL（相对或绝对） */
  url: string;
}

/**
 * Manifest 清单
 * 从服务端 Manifest 类型复用
 */
export interface Manifest {
  /** 更新 ID（UUID） */
  id: string;
  /** 创建时间（ISO8601） */
  createdAt: string;
  /** 运行时版本 */
  runtimeVersion: string;
  /** 启动资源（JS Bundle） */
  launchAsset: ManifestAsset;
  /** 其他资源列表 */
  assets: ManifestAsset[];
  /** 元数据（用于过滤、版本显示等） */
  metadata: Record<string, string>;
  /** 额外信息 */
  extra: Record<string, unknown>;
}

// ==================== Directive 相关类型 ====================

/**
 * 指令类型
 */
export type DirectiveType = 'rollBackToEmbedded' | 'noUpdateAvailable';

/**
 * 指令响应
 */
export interface Directive {
  /** 指令类型 */
  type: DirectiveType;
  /** 指令参数 */
  parameters?: Record<string, unknown>;
  /** 额外信息 */
  extra?: Record<string, unknown>;
}

// ==================== 响应类型 ====================

/**
 * 响应类型枚举
 */
export const RESPONSE_TYPE = {
  /** 有更新可用 */
  UPDATE_AVAILABLE: 'updateAvailable',
  /** 无更新可用 */
  NO_UPDATE: 'noUpdate',
  /** 回滚指令 */
  ROLLBACK: 'rollback',
} as const;

export type ResponseType = (typeof RESPONSE_TYPE)[keyof typeof RESPONSE_TYPE];

/**
 * 检查更新响应（联合类型）
 */
export type CheckUpdateResponse =
  | {
      type: typeof RESPONSE_TYPE.UPDATE_AVAILABLE;
      manifest: Manifest;
      manifestFilters?: string;
      signature?: string;
    }
  | {
      type: typeof RESPONSE_TYPE.NO_UPDATE;
    }
  | {
      type: typeof RESPONSE_TYPE.ROLLBACK;
      directive: Directive;
    };

// ==================== 平台类型 ====================

/**
 * 支持的平台
 */
export type Platform = 'ios' | 'android';

// ==================== 统计事件类型 ====================

/**
 * 统计事件类型
 */
export const ANALYTICS_EVENT_TYPE = {
  UPDATE_CHECK: 'update_check',
  DOWNLOAD_START: 'download_start',
  DOWNLOAD_COMPLETE: 'download_complete',
  DOWNLOAD_FAILED: 'download_failed',
  APPLY_START: 'apply_start',
  APPLY_SUCCESS: 'apply_success',
  APPLY_FAILED: 'apply_failed',
  ROLLBACK: 'rollback',
} as const;

export type AnalyticsEventType =
  (typeof ANALYTICS_EVENT_TYPE)[keyof typeof ANALYTICS_EVENT_TYPE];

/**
 * 统计事件
 */
export interface AnalyticsEvent {
  /** 事件类型 */
  type: AnalyticsEventType;
  /** 设备 ID */
  deviceId: string;
  /** 更新 ID */
  updateId?: string;
  /** 运行时版本 */
  runtimeVersion?: string;
  /** 时间戳（ISO8601） */
  timestamp: string;
  /** 额外数据 */
  extra?: Record<string, unknown>;
}
