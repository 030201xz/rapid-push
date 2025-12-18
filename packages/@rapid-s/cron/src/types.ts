/**
 * CRON 字段定义
 */
export interface CronFields {
  second?: number[]; // 0-59 (可选,6段式)
  minute: number[]; // 0-59
  hour: number[]; // 0-23
  day: number[]; // 1-31
  month: number[]; // 1-12
  weekday: number[]; // 0-6 (0 = Sunday)
}

/**
 * 解析后的 CRON 表达式
 */
export interface CronExpression {
  expression: string;
  fields: CronFields;
}

/**
 * 任务函数类型
 * TContext - 当前累积的上下文类型
 * TReturn - 当前任务返回的数据类型
 */
export type TaskFunction<TContext, TReturn> = (
  ctx: TContext
) => TReturn | Promise<TReturn>;

/**
 * 任务配置
 */
export interface TaskConfig {
  /** 任务名称 */
  name?: string;
  /** 错误时是否继续执行后续任务 */
  continueOnError?: boolean;
}

/**
 * 时间单位类型
 */
export type TimeUnit = "second" | "minute" | "hour" | "day" | "week" | "month";

/**
 * 任务作业接口 - 用于控制任务
 */
export interface CronJob {
  /** 任务 ID */
  readonly id: string;
  /** CRON 表达式 */
  readonly cron: string;
  /** 下次执行时间 */
  readonly nextRun: Date;
  /** 是否正在运行 */
  readonly running: boolean;
  /** 任务数量 */
  readonly taskCount: number;
  /** 暂停任务 */
  pause(): void;
  /** 恢复任务 */
  resume(): void;
  /** 停止并移除任务 */
  stop(): void;
}
