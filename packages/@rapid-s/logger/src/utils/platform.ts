/**
 * 平台类型
 */
export type Platform = 'browser' | 'node' | 'bun' | 'unknown';

/**
 * 检测当前运行平台
 */
export function detectPlatform(): Platform {
  // 检测浏览器环境
  if (typeof (globalThis as any).window !== 'undefined' && typeof (globalThis as any).document !== 'undefined') {
    return 'browser';
  }

  // 检测 Bun 环境
  if (typeof Bun !== 'undefined') {
    return 'bun';
  }

  // 检测 Node.js 环境
  if (typeof process !== 'undefined' && process.versions?.node) {
    return 'node';
  }

  return 'unknown';
}

/**
 * 检查是否支持 ANSI 颜色
 */
export function supportsColor(): boolean {
  const platform = detectPlatform();

  if (platform === 'browser') {
    return true; // 浏览器使用 CSS 样式
  }

  // 终端环境检查
  if (typeof process !== 'undefined') {
    // CI 环境通常不支持颜色
    if (process.env.CI === 'true' || process.env.NO_COLOR) {
      return false;
    }

    // 检查 TERM 环境变量
    const term = process.env.TERM;
    if (term === 'dumb') {
      return false;
    }

    // 检查 COLORTERM
    if (process.env.COLORTERM) {
      return true;
    }

    // 检查是否为 TTY
    if (process.stdout && typeof process.stdout.isTTY === 'boolean') {
      return process.stdout.isTTY;
    }
  }

  return true;
}
