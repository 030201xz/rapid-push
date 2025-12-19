/**
 * 核心模块统一导出
 */

export { Updater, checkForUpdate, downloadUpdate, applyUpdate, getCurrentUpdate, isUpdaterAvailable } from './updater';
export { Storage, StorageKeys, getDeviceId, DismissedUpdates, getLastCheckTime, setLastCheckTime } from './storage';
export {
  configureAnalytics,
  trackEvent,
  flushAnalytics,
  trackCheckEvent,
  trackDownloadStart,
  trackDownloadComplete,
  trackDownloadFailed,
  trackApplySuccess,
  trackApplyFailed,
} from './analytics';
