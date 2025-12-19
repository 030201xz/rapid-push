/**
 * 状态类型定义
 *
 * 定义 SDK 内部状态机和 Hook 返回类型
 */

import type { Manifest, RapidPushError } from './protocol';

// ==================== 下载状态 ====================

/** 空闲状态 */
export interface DownloadStateIdle {
  readonly status: 'idle';
}

/** 下载中状态 */
export interface DownloadStateDownloading {
  readonly status: 'downloading';
  /** 进度 0-1 */
  readonly progress: number;
  /** 已下载字节数 */
  readonly downloaded: number;
  /** 总字节数 */
  readonly total: number;
}

/** 下载完成状态 */
export interface DownloadStateCompleted {
  readonly status: 'completed';
  readonly manifest: Manifest;
}

/** 下载失败状态 */
export interface DownloadStateFailed {
  readonly status: 'failed';
  readonly error: RapidPushError;
}

/** 下载状态联合类型 */
export type DownloadState =
  | DownloadStateIdle
  | DownloadStateDownloading
  | DownloadStateCompleted
  | DownloadStateFailed;

// ==================== 更新状态 ====================

/** 完整更新状态 */
export interface UpdateState {
  /** 正在检查更新 */
  readonly checking: boolean;

  /** 下载状态 */
  readonly download: DownloadState;

  /** 可用更新（检查成功后） */
  readonly available: Manifest | null;

  /** 待应用更新（下载完成后） */
  readonly pending: Manifest | null;

  /** 当前错误 */
  readonly error: RapidPushError | null;

  /** 上次检查时间 */
  readonly lastCheckTime: Date | null;
}

/** 初始状态 */
export const INITIAL_UPDATE_STATE: UpdateState = {
  checking: false,
  download: { status: 'idle' },
  available: null,
  pending: null,
  error: null,
  lastCheckTime: null,
};

// ==================== Action 类型 ====================

export type UpdateAction =
  | { type: 'CHECK_START' }
  | { type: 'CHECK_SUCCESS'; payload: Manifest | null }
  | { type: 'CHECK_ERROR'; payload: RapidPushError }
  | { type: 'DOWNLOAD_START'; payload: { total: number } }
  | {
      type: 'DOWNLOAD_PROGRESS';
      payload: { downloaded: number; progress: number };
    }
  | { type: 'DOWNLOAD_SUCCESS'; payload: Manifest }
  | { type: 'DOWNLOAD_ERROR'; payload: RapidPushError }
  | { type: 'DISMISS_UPDATE' }
  | { type: 'CLEAR_ERROR' }
  | { type: 'SET_PENDING'; payload: Manifest };

/** 状态 Reducer */
export function updateReducer(
  state: UpdateState,
  action: UpdateAction
): UpdateState {
  switch (action.type) {
    case 'CHECK_START':
      return {
        ...state,
        checking: true,
        error: null,
      };

    case 'CHECK_SUCCESS':
      return {
        ...state,
        checking: false,
        available: action.payload,
        lastCheckTime: new Date(),
      };

    case 'CHECK_ERROR':
      return {
        ...state,
        checking: false,
        error: action.payload,
      };

    case 'DOWNLOAD_START':
      return {
        ...state,
        download: {
          status: 'downloading',
          progress: 0,
          downloaded: 0,
          total: action.payload.total,
        },
        error: null,
      };

    case 'DOWNLOAD_PROGRESS':
      // 仅在下载中状态才更新进度
      if (state.download.status !== 'downloading') return state;
      return {
        ...state,
        download: {
          ...state.download,
          downloaded: action.payload.downloaded,
          progress: action.payload.progress,
        },
      };

    case 'DOWNLOAD_SUCCESS':
      return {
        ...state,
        download: {
          status: 'completed',
          manifest: action.payload,
        },
        pending: action.payload,
      };

    case 'DOWNLOAD_ERROR':
      return {
        ...state,
        download: {
          status: 'failed',
          error: action.payload,
        },
        error: action.payload,
      };

    case 'DISMISS_UPDATE':
      return {
        ...state,
        available: null,
        download: { status: 'idle' },
      };

    case 'CLEAR_ERROR':
      return {
        ...state,
        error: null,
      };

    case 'SET_PENDING':
      return {
        ...state,
        pending: action.payload,
      };

    default:
      return state;
  }
}

// ==================== Hook 返回类型 ====================

/** useUpdates Hook 返回类型 */
export interface UseUpdatesResult {
  // 状态
  readonly state: UpdateState;
  readonly isChecking: boolean;
  readonly isDownloading: boolean;
  readonly progress: number;
  readonly available: Manifest | null;
  readonly pending: Manifest | null;
  readonly error: RapidPushError | null;

  // 操作
  readonly check: () => Promise<Manifest | null>;
  readonly download: () => Promise<void>;
  readonly apply: () => Promise<never>;
  readonly dismiss: () => void;
  readonly rollback: () => Promise<never>;
  readonly clearError: () => void;
}

/** useCurrentUpdate Hook 返回类型 */
export interface UseCurrentUpdateResult {
  readonly updateId: string | null;
  readonly runtimeVersion: string;
  readonly channel: string | null;
  readonly createdAt: Date | null;
  readonly isEmbedded: boolean;
}

/** useDeviceInfo Hook 返回类型 */
export interface UseDeviceInfoResult {
  readonly deviceId: string;
  readonly platform: 'ios' | 'android';
  readonly platformVersion: string;
}
