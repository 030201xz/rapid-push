import { BaseLogger } from '../core/logger';
import type { LoggerOptions, LogEntry, LogColumnSpec, LogColumnRenderArgs, LogColumnAlignment } from '../core/types';
import { LOG_LEVEL_NAMES } from '../core/types';
import { LEVEL_COLORS, ansi } from '../core/colors';
import { loadEnvConfig } from '../utils/env';
import { supportsColor } from '../utils/platform';
import { visibleLength } from '../utils/string';

type BuiltInColumnId = 'level' | 'timestamp' | 'namespace' | 'message';

const DEFAULT_COLUMNS: LogColumnSpec[] = [
  {
    id: 'level',
    width: 6,
    align: 'left',
  },
  {
    id: 'timestamp',
    width: 12,
    align: 'right',
  },
  {
    id: 'namespace',
    align: 'left',
  },
  {
    id: 'message',
    padding: 0,
  },
];

interface ColumnCell {
  text: string;
  width?: number;
  align: LogColumnAlignment;
  padding: number;
}

/**
 * Node/Bun 终端平台 Logger 实现
 */
export class NodeLogger extends BaseLogger {
  private supportsColor: boolean;

  constructor(options: LoggerOptions = {}) {
    // 合并环境变量配置
    const envConfig = loadEnvConfig();
    const mergedOptions: LoggerOptions = {
      ...envConfig,
      ...options,
    };
    super(mergedOptions);

    // 检测终端颜色支持
    this.supportsColor = supportsColor() && this.color;
  }

  /**
   * 输出日志到终端
   */
  protected write(entry: LogEntry): void {
    const { level, context } = entry;

    if (this.format === 'json') {
      this.writeJson(entry);
      return;
    }

    const logMessage = this.formatPretty(entry);

    // 输出到 stdout/stderr
    if (level >= 4) {
      // ERROR 和 FATAL 输出到 stderr
      process.stderr.write(logMessage + '\n');
      if (context) {
        process.stderr.write(this.formatContext(context) + '\n');
      }
    } else {
      process.stdout.write(logMessage + '\n');
      if (context) {
        process.stdout.write(this.formatContext(context) + '\n');
      }
    }
  }

  private formatPretty(entry: LogEntry): string {
    const levelName = LOG_LEVEL_NAMES[entry.level];
    const formattedTimestamp = this.timestamp ? this.formatTimestamp(entry.timestamp) : undefined;
    const layout = this.columns && this.columns.length > 0 ? this.columns : DEFAULT_COLUMNS;
    const args: LogColumnRenderArgs = {
      entry,
      levelName,
      formattedTimestamp,
      supportsColor: this.supportsColor,
    };

    const cells: ColumnCell[] = [];
    for (const spec of layout) {
      const cell = this.createColumnCell(spec, args);
      if (cell) {
        cells.push(cell);
      }
    }

    return renderColumns(cells);
  }

  private createColumnCell(spec: LogColumnSpec, args: LogColumnRenderArgs): ColumnCell | null {
    if (spec.enabled === false) {
      return null;
    }

    if (spec.id === 'timestamp' && !this.timestamp) {
      return null;
    }

    if (spec.id === 'namespace' && !args.entry.namespace) {
      return null;
    }

    const text = this.renderColumnText(spec, args);
    if (text === undefined || text === null) {
      return null;
    }

    return {
      text,
      width: spec.width,
      align: spec.align ?? 'left',
      padding: spec.padding ?? 1,
    };
  }

  private renderColumnText(spec: LogColumnSpec, args: LogColumnRenderArgs): string | undefined {
    if (spec.render) {
      return spec.render(args);
    }

    switch (spec.id as BuiltInColumnId) {
      case 'level':
        return this.renderLevel(args.entry.level, args.levelName);
      case 'timestamp':
        return args.formattedTimestamp ? this.renderTimestamp(args.formattedTimestamp) : undefined;
      case 'namespace':
        return args.entry.namespace ? this.renderNamespace(args.entry.namespace) : undefined;
      case 'message':
        return args.entry.message;
      default:
        return undefined;
    }
  }

  private renderLevel(level: LogEntry['level'], label: string): string {
    if (this.supportsColor) {
      const colorConfig = LEVEL_COLORS[level];
      return ansi.color(colorConfig.ansi, label);
    }
    return label;
  }

  private renderTimestamp(value: string): string {
    return this.supportsColor ? ansi.gray(value) : value;
  }

  private renderNamespace(namespace: string): string {
    const label = `[${namespace}]`;
    return this.supportsColor ? ansi.cyan(label) : label;
  }

  /**
   * 输出 JSON 格式日志
   */
  private writeJson(entry: LogEntry): void {
    const jsonLog = {
      level: LOG_LEVEL_NAMES[entry.level],
      message: entry.message,
      timestamp: entry.timestamp.toISOString(),
      ...(entry.namespace && { namespace: entry.namespace }),
      ...(entry.context && { context: entry.context }),
    };

    process.stdout.write(JSON.stringify(jsonLog) + '\n');
  }

  /**
   * 格式化上下文对象
   */
  private formatContext(context: Record<string, any>): string {
    try {
      const formatted = JSON.stringify(context, null, 2);
      if (this.supportsColor) {
        return ansi.gray(formatted);
      }
      return formatted;
    } catch (error) {
      return String(context);
    }
  }

  /**
   * 创建子 logger
   */
  protected createChild(options: LoggerOptions): BaseLogger {
    return new NodeLogger(options);
  }
}

function alignText(text: string, width?: number, align: LogColumnAlignment = 'left'): string {
  if (!width || width <= 0) {
    return text;
  }

  const length = visibleLength(text);
  if (length >= width) {
    return text;
  }

  const diff = width - length;
  if (align === 'right') {
    return ' '.repeat(diff) + text;
  }

  if (align === 'center') {
    const left = Math.floor(diff / 2);
    const right = diff - left;
    return `${' '.repeat(left)}${text}${' '.repeat(right)}`;
  }

  return `${text}${' '.repeat(diff)}`;
}

function renderColumns(columns: ColumnCell[]): string {
  return columns
    .map((column, index) => {
      const padded = alignText(column.text, column.width, column.align);
      const gap = index === columns.length - 1 ? 0 : column.padding;
      return gap > 0 ? `${padded}${' '.repeat(gap)}` : padded;
    })
    .join('');
}

/**
 * 创建默认 Node/Bun logger 实例
 */
export function createLogger(options?: LoggerOptions): NodeLogger {
  return new NodeLogger(options);
}

/**
 * 默认导出 logger 实例
 */
const logger = createLogger();
export default logger;
