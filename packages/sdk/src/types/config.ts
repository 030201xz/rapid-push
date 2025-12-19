/**
 * SDK 配置类型定义
 *
 * 定义 SDK 初始化和运行时配置选项
 */

/** 平台类型 */
export type Platform = 'ios' | 'android';

/** SDK 配置选项 */
export interface RapidPushConfig {
  /** 渠道密钥（必需） */
  readonly channelKey: string;

  /** 服务端 URL（必需） */
  readonly serverUrl: string;

  /** 运行时版本（默认从 expo-constants 读取） */
  readonly runtimeVersion?: string;

  /** 是否启用代码签名验证（默认 false） */
  readonly enableCodeSigning?: boolean;

  /** 签名公钥 PEM（启用签名验证时必需） */
  readonly codeSigningPublicKey?: string;
}

/** 自动检查配置 */
export interface AutoCheckConfig {
  /** 启动时检查 */
  readonly onMount?: boolean;

  /** 检查间隔（毫秒，0 表示禁用） */
  readonly interval?: number;
}

/** Provider 组件属性 */
export interface RapidPushProviderProps {
  /** SDK 配置 */
  readonly config: RapidPushConfig;

  /** 子组件 */
  readonly children: React.ReactNode;

  /** 自动检查配置 */
  readonly autoCheck?: AutoCheckConfig;

  /** 更新可用回调 */
  readonly onUpdateAvailable?: (manifest: Manifest) => void;

  /** 更新下载完成回调 */
  readonly onUpdateDownloaded?: (manifest: Manifest) => void;

  /** 错误回调 */
  readonly onError?: (error: RapidPushError) => void;
}

// 从协议类型导入
import type { Manifest, RapidPushError } from './protocol';
