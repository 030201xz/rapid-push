/**
 * 平台检测工具
 *
 * 用于识别 Expo Bundle 中的资源所属平台
 */

/** 平台类型 */
export type Platform = 'ios' | 'android' | null;

/**
 * 根据文件路径检测平台
 *
 * 路径规则：
 * - 包含 /ios/ 或以 ios/ 开头 -> ios
 * - 包含 /android/ 或以 android/ 开头 -> android
 * - 其他 -> null（通用资源）
 *
 * @param filePath - 文件在 ZIP 中的相对路径
 * @returns 平台标识
 */
export function detectPlatform(filePath: string): Platform {
  const lowerPath = filePath.toLowerCase();

  if (lowerPath.includes('/ios/') || lowerPath.startsWith('ios/')) {
    return 'ios';
  }

  if (
    lowerPath.includes('/android/') ||
    lowerPath.startsWith('android/')
  ) {
    return 'android';
  }

  return null;
}

/**
 * 检测文件是否为 Launch Asset（JS Bundle 入口）
 *
 * 判断规则：
 * - 文件名包含 bundle（如 index.bundle）
 * - 文件名为 main.jsbundle 或 index.android.bundle
 * - 路径包含 _expo/static/js/
 *
 * @param filePath - 文件路径
 * @param fileName - 文件名
 * @returns 是否为 Launch Asset
 */
export function detectIsLaunchAsset(
  filePath: string,
  fileName: string
): boolean {
  const lowerPath = filePath.toLowerCase();
  const lowerName = fileName.toLowerCase();

  // 常见的 Launch Asset 命名模式
  const launchAssetPatterns = [
    'index.bundle',
    'main.jsbundle',
    'index.android.bundle',
    'index.ios.bundle',
  ];

  if (launchAssetPatterns.some(p => lowerName.includes(p))) {
    return true;
  }

  // Expo 静态 JS 路径模式
  if (lowerPath.includes('_expo/static/js/')) {
    return true;
  }

  // 文件名包含 bundle 且是 JS 文件
  if (lowerName.includes('bundle') && lowerName.endsWith('.js')) {
    return true;
  }

  return false;
}

/**
 * 获取文件扩展名
 *
 * @param fileName - 文件名
 * @returns 扩展名（含点号）或 null
 */
export function getFileExtension(fileName: string): string | null {
  const lastDotIndex = fileName.lastIndexOf('.');
  if (lastDotIndex === -1 || lastDotIndex === 0) {
    return null;
  }
  return fileName.substring(lastDotIndex);
}
