/**
 * Manifest 类型定义
 *
 * 定义客户端检查更新请求和响应的类型结构
 */

import { z } from 'zod';

// ========== 请求相关类型 ==========

/** 平台类型 */
export const platformSchema = z.enum(['ios', 'android']);
export type Platform = z.infer<typeof platformSchema>;

/** 检查更新请求参数 */
export const checkUpdateRequestSchema = z.object({
  /** 渠道密钥 */
  channelKey: z.string().min(1),
  /** 运行时版本 */
  runtimeVersion: z.string().min(1),
  /** 目标平台 */
  platform: platformSchema,
  /** 当前更新 ID（可选，用于判断是否需要更新） */
  currentUpdateId: z.uuid().optional(),
  /** 嵌入更新 ID（可选） */
  embeddedUpdateId: z.uuid().optional(),
  /** 设备 ID（可选，用于灰度规则匹配） */
  deviceId: z.string().optional(),
  /** 自定义请求头（可选，用于灰度规则匹配） */
  customHeaders: z.record(z.string(), z.string()).optional(),
});

export type CheckUpdateRequest = z.infer<
  typeof checkUpdateRequestSchema
>;

// ========== 响应相关类型 ==========

/** 资源信息 */
export interface ManifestAsset {
  /** 资源哈希 */
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

/** Manifest 清单（有更新可用时返回） */
export interface Manifest {
  /** 更新 ID */
  id: string;
  /** 创建时间 */
  createdAt: string;
  /** 运行时版本 */
  runtimeVersion: string;
  /** 启动资源（JS Bundle） */
  launchAsset: ManifestAsset;
  /** 其他资源列表 */
  assets: ManifestAsset[];
  /** 元数据 */
  metadata: Record<string, string>;
  /** 额外信息 */
  extra: Record<string, unknown>;
}

/** 指令类型 */
export type DirectiveType =
  | 'rollBackToEmbedded'
  | 'noUpdateAvailable';

/** 指令响应 */
export interface Directive {
  /** 指令类型 */
  type: DirectiveType;
  /** 指令参数 */
  parameters?: Record<string, unknown>;
  /** 额外信息 */
  extra?: Record<string, unknown>;
}

/** 响应类型枚举 */
export const RESPONSE_TYPE = {
  /** 有更新可用 */
  UPDATE_AVAILABLE: 'updateAvailable',
  /** 无更新可用 */
  NO_UPDATE: 'noUpdate',
  /** 回滚指令 */
  ROLLBACK: 'rollback',
} as const;

export type ResponseType =
  (typeof RESPONSE_TYPE)[keyof typeof RESPONSE_TYPE];

/** 检查更新响应（联合类型） */
export type CheckUpdateResponse =
  | {
      type: typeof RESPONSE_TYPE.UPDATE_AVAILABLE;
      manifest: Manifest;
      signature?: string; // 代码签名
    }
  | {
      type: typeof RESPONSE_TYPE.NO_UPDATE;
    }
  | {
      type: typeof RESPONSE_TYPE.ROLLBACK;
      directive: Directive;
    };
