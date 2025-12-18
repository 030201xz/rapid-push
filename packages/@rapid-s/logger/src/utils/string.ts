const ANSI_REGEX = /\x1b\[[0-9;]*m/g;

/**
 * 移除 ANSI 颜色码
 */
export function stripAnsi(value: string): string {
  return value.replace(ANSI_REGEX, '');
}

/**
 * 获取可见字符长度
 */
export function visibleLength(value: string): number {
  return stripAnsi(value).length;
}
