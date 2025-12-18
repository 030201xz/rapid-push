import type { ColorConfig } from './types';
import { LogLevel } from './types';

/**
 * 日志级别颜色配置
 */
export const LEVEL_COLORS: Record<LogLevel, ColorConfig> = {
  [LogLevel.TRACE]: {
    bg: '#6B7280',
    fg: '#FFFFFF',
    ansi: 90, // 亮黑色(灰色)
    // badge: '🔍',
    badge: '',
  },
  [LogLevel.DEBUG]: {
    bg: '#3B82F6',
    fg: '#FFFFFF',
    ansi: 34, // 蓝色
    // badge: '🐛',
    badge: '',
  },
  [LogLevel.INFO]: {
    bg: '#10B981',
    fg: '#FFFFFF',
    ansi: 32, // 绿色
    // badge: 'ℹ️',
    badge: '',
  },
  [LogLevel.WARN]: {
    bg: '#F59E0B',
    fg: '#FFFFFF',
    ansi: 33, // 黄色
    // badge: '⚠️',
    badge: '',
  },
  [LogLevel.ERROR]: {
    bg: '#EF4444',
    fg: '#FFFFFF',
    ansi: 31, // 红色
    // badge: '❌',
    badge: '',
  },
  [LogLevel.FATAL]: {
    bg: '#7C2D12',
    fg: '#FFFFFF',
    ansi: 91, // 亮红色
    // badge: '💀',
    badge: '',
  },
  [LogLevel.SILENT]: {
    bg: '#000000',
    fg: '#FFFFFF',
    ansi: 0,
    badge: '',
  },
};

/**
 * ANSI 颜色工具函数
 */
export const ansi = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',

  color: (code: number, text: string): string => {
    return `\x1b[${code}m${text}\x1b[0m`;
  },

  gray: (text: string): string => ansi.color(90, text),
  red: (text: string): string => ansi.color(31, text),
  green: (text: string): string => ansi.color(32, text),
  yellow: (text: string): string => ansi.color(33, text),
  blue: (text: string): string => ansi.color(34, text),
  magenta: (text: string): string => ansi.color(35, text),
  cyan: (text: string): string => ansi.color(36, text),
  white: (text: string): string => ansi.color(37, text),
};
