import { CronParser } from "./cron-parser";
import { JobBuilder } from "./job-builder";
import type { InternalCronJob } from "./task-chain-builder";
import { TaskChainBuilder } from "./task-chain-builder";
import { TimeBuilder } from "./time-builder";

/**
 * CRON 调度器配置
 */
export interface CronConfig {
  /** 是否自动启动,默认 true */
  autoStart?: boolean;
}

/**
 * CRON 调度器
 * 提供优雅的任务调度 API
 */
export class Cron {
  private jobs = new Map<string, InternalCronJob>();
  private started = false;

  constructor(config: CronConfig = {}) {
    // autoStart 默认为 true
    if (config.autoStart !== false) {
      this.start();
    }
  }

  /**
   * 创建定时任务
   *
   * @overload
   * @param value - 时间间隔数字，后续需要调用 .seconds() / .minutes() 等
   * @example
   * ```ts
   * cron.every(5).seconds()
   * cron.every(1).minute()
   * cron.every(2).hours()
   * ```
   */
  every(value: number): TimeBuilder;

  /**
   * 创建定时任务
   *
   * @overload
   * @param expression - CRON 表达式字符串，直接返回 JobBuilder
   * @example
   * ```ts
   * cron.every("*\/5 * * * * *")
   * cron.every("0 2 * * *")
   * ```
   */
  every(expression: string): JobBuilder;

  /**
   * 创建定时任务（实现）
   */
  every(valueOrExpression: number | string): TimeBuilder | JobBuilder {
    if (typeof valueOrExpression === "string") {
      // CRON 表达式模式
      return new JobBuilder(valueOrExpression, (cron) =>
        this.createJobChain(cron)
      );
    } else {
      // 自然语言模式
      return new TimeBuilder((cronExpression) => {
        return new JobBuilder(cronExpression, (cron) =>
          this.createJobChain(cron)
        );
      }, valueOrExpression);
    }
  }

  /**
   * 创建任务链（内部方法）
   * 返回一个带有 jobRef 的初始链，用于后续添加任务
   */
  private createJobChain(
    cronExpression: string
  ): TaskChainBuilder<Record<string, never>> {
    const expression = CronParser.parse(cronExpression);
    const id = `job_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    const nextRun = CronParser.getNextRunTime(expression);

    // 创建任务引用，用于双向绑定
    const jobRef: { current: InternalCronJob | null } = { current: null };

    // 创建初始任务链，传入 jobRef
    const chain = new TaskChainBuilder<Record<string, never>>(jobRef);

    const internalJob: InternalCronJob = {
      id,
      cron: cronExpression,
      taskChain: chain,
      nextRun,
      running: false,
      paused: false,
      onTaskAdded: () => {
        // 首次添加任务时，如果调度器已启动且未暂停，则启动调度
        if (this.started && !internalJob.paused && !internalJob.timer) {
          this.scheduleJob(internalJob);
        }
      },
    };

    jobRef.current = internalJob;
    this.jobs.set(id, internalJob);

    // 注入任务控制方法到链式构建器
    const pause = () => {
      if (!internalJob.paused) {
        internalJob.paused = true;
        if (internalJob.timer) {
          clearTimeout(internalJob.timer);
          internalJob.timer = undefined;
        }
        internalJob.onPause?.();
      }
    };

    const resume = () => {
      if (internalJob.paused) {
        internalJob.paused = false;
        if (this.started) {
          this.scheduleJob(internalJob);
        }
        internalJob.onResume?.();
      }
    };

    const stop = () => {
      if (internalJob.timer) {
        clearTimeout(internalJob.timer);
        internalJob.timer = undefined;
      }
      this.jobs.delete(internalJob.id);
      internalJob.onStop?.();
    };

    // 注入到初始链
    chain.pause = pause;
    chain.resume = resume;
    chain.stop = stop;

    // 如果调度器已启动，在第一个任务添加后才调度
    // 这里先不调度，等 do() 被调用后再调度

    return chain;
  }

  /**
   * 启动调度器
   */
  start(): void {
    if (this.started) return;
    this.started = true;

    // 为所有未暂停的任务设置定时器
    for (const job of this.jobs.values()) {
      if (!job.paused) {
        this.scheduleJob(job);
      }
    }
  }

  /**
   * 停止调度器
   */
  stop(): void {
    if (!this.started) return;
    this.started = false;

    // 清除所有定时器
    for (const job of this.jobs.values()) {
      if (job.timer) {
        clearTimeout(job.timer);
        job.timer = undefined;
      }
    }
  }

  /**
   * 为任务设置定时器
   */
  private scheduleJob(job: InternalCronJob): void {
    if (job.timer) {
      clearTimeout(job.timer);
    }

    const now = new Date();
    const delay = job.nextRun.getTime() - now.getTime();

    if (delay <= 0) {
      // 立即执行
      this.executeJob(job);
    } else {
      // 设置定时器
      job.timer = setTimeout(() => {
        this.executeJob(job);
      }, delay);
    }
  }

  /**
   * 执行任务
   */
  private async executeJob(job: InternalCronJob): Promise<void> {
    if (job.running || job.paused) {
      return;
    }

    job.running = true;

    try {
      await job.taskChain.execute();
    } catch (error) {
      // 任务执行失败，用户可以在任务链中自行处理
      // 这里不做任何处理，保持简洁
    } finally {
      job.running = false;

      // 计算下次执行时间
      job.nextRun = CronParser.getNextRunTime(CronParser.parse(job.cron));

      // 重新调度
      if (this.started && !job.paused) {
        this.scheduleJob(job);
      }
    }
  }

  /**
   * 清除所有任务
   */
  clear(): void {
    this.stop();
    this.jobs.clear();
  }

  /**
   * 获取所有任务列表（简化版）
   */
  list(): Array<{
    id: string;
    cron: string;
    nextRun: Date;
    running: boolean;
    paused: boolean;
    taskCount: number;
  }> {
    return Array.from(this.jobs.values()).map((job) => ({
      id: job.id,
      cron: job.cron,
      nextRun: job.nextRun,
      running: job.running,
      paused: job.paused,
      taskCount: job.taskChain.length,
    }));
  }

  /**
   * @deprecated 使用 list() 替代
   */
  getJobs() {
    return this.list();
  }
}
