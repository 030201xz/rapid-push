/**
 * 更新状态机类型定义
 *
 * 使用判别联合类型确保状态与数据的一致性
 */

import type { Directive, Manifest } from './server';
import type { UpdaterError } from './config';

/**
 * 更新状态（判别联合类型）
 *
 * 每个状态携带该状态下可用的数据
 */
export type UpdaterState =
  | {
      /** 空闲状态 - 无操作进行中 */
      status: 'idle';
    }
  | {
      /** 检查中 - 正在向服务器请求更新信息 */
      status: 'checking';
    }
  | {
      /** 有更新可用 - 等待用户决定 */
      status: 'available';
      /** 可用的 Manifest */
      manifest: Manifest;
    }
  | {
      /** 下载中 - 正在下载更新资源 */
      status: 'downloading';
      /** 下载进度（0-1） */
      progress: number;
      /** 正在下载的 Manifest */
      manifest: Manifest;
    }
  | {
      /** 就绪 - 更新已下载，等待应用 */
      status: 'ready';
      /** 已下载的 Manifest */
      manifest: Manifest;
    }
  | {
      /** 应用中 - 正在重启应用 */
      status: 'applying';
      /** 正在应用的 Manifest */
      manifest: Manifest;
    }
  | {
      /** 回滚 - 收到回滚指令 */
      status: 'rollback';
      /** 回滚指令 */
      directive: Directive;
    }
  | {
      /** 错误状态 */
      status: 'error';
      /** 错误信息 */
      error: UpdaterError;
    };

/**
 * 更新操作接口
 */
export interface UpdaterActions {
  /**
   * 检查更新
   *
   * @returns 如果有更新返回 Manifest，否则返回 null
   */
  checkForUpdate: () => Promise<Manifest | null>;

  /**
   * 下载更新
   *
   * 必须在 status === 'available' 时调用
   */
  downloadUpdate: () => Promise<void>;

  /**
   * 应用更新（重启应用）
   *
   * 必须在 status === 'ready' 时调用
   */
  applyUpdate: () => Promise<void>;

  /**
   * 忽略当前可用更新
   *
   * 可选择是否持久化忽略
   */
  dismissUpdate: (persistent?: boolean) => void;

  /**
   * 重置错误状态
   */
  clearError: () => void;
}

/**
 * 当前运行的更新信息
 */
export interface CurrentUpdateInfo {
  /** 更新 ID（嵌入版本为 null） */
  updateId: string | null;

  /** 运行时版本 */
  runtimeVersion: string;

  /** 渠道密钥 */
  channelKey: string | null;

  /** 更新创建时间（嵌入版本为 null） */
  createdAt: Date | null;

  /** 是否为嵌入版本（未应用任何热更新） */
  isEmbedded: boolean;
}

/**
 * useUpdater Hook 返回值
 */
export interface UseUpdaterResult extends UpdaterActions {
  /** 当前状态 */
  state: UpdaterState;
}

/**
 * useUpdateInfo Hook 返回值
 */
export interface UseUpdateInfoResult extends CurrentUpdateInfo {
  /** 上次检查更新时间 */
  lastCheckTime: Date | null;

  /** 是否有待应用的更新 */
  hasPendingUpdate: boolean;
}
