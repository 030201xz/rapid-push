/**
 * SDK 配置类型定义
 */

/**
 * RapidS SDK 配置选项
 */
export interface RapidSConfig {
  /**
   * 渠道密钥（必需）
   *
   * 用于标识更新渠道，从服务端管理后台获取
   * @example "ch_EFuQ6wGyBlfe1EahfnZp9wPnQoZDi8N9"
   */
  channelKey: string;

  /**
   * 服务器地址（可选）
   *
   * 如未提供，将从 app.json 中 expo.updates.url 解析
   * @example "https://updates.yourapp.com"
   */
  serverUrl?: string;

  /**
   * 启动时自动检查更新
   * @default true
   */
  checkOnMount?: boolean;

  /**
   * 自动检查间隔（毫秒）
   *
   * 设为 0 表示不自动检查
   * @default 0
   */
  checkInterval?: number;

  /**
   * 启用统计上报
   * @default true
   */
  enableAnalytics?: boolean;

  /**
   * 设备 ID（用于灰度规则）
   *
   * 如未提供，SDK 会自动生成并持久化
   */
  deviceId?: string;

  /**
   * 自定义请求头（用于灰度规则）
   *
   * 可用于按地区、用户分组等条件进行灰度
   */
  customHeaders?: Record<string, string>;
}

/**
 * RapidS Provider 组件属性
 */
export interface RapidSProviderProps extends RapidSConfig {
  /** 子组件 */
  children: React.ReactNode;

  /**
   * 更新可用时的回调
   *
   * 可用于显示自定义更新提示
   */
  onUpdateAvailable?: (manifest: import('./server').Manifest) => void;

  /**
   * 更新下载完成时的回调
   */
  onUpdateDownloaded?: (manifest: import('./server').Manifest) => void;

  /**
   * 收到回滚指令时的回调
   */
  onRollback?: (directive: import('./server').Directive) => void;

  /**
   * 错误发生时的回调
   */
  onError?: (error: UpdaterError) => void;
}

/**
 * SDK 错误类型
 */
export type UpdaterErrorCode =
  | 'CHECK_FAILED'
  | 'DOWNLOAD_FAILED'
  | 'APPLY_FAILED'
  | 'NETWORK_ERROR'
  | 'SIGNATURE_INVALID'
  | 'UNKNOWN';

/**
 * SDK 错误
 */
export interface UpdaterError {
  /** 错误码 */
  code: UpdaterErrorCode;
  /** 错误消息 */
  message: string;
  /** 原始错误 */
  cause?: unknown;
}
