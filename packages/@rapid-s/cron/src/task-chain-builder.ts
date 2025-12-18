import type { TaskConfig, TaskFunction } from "./types";

/**
 * 类型安全的任务链构建器
 * 支持链式调用,自动累积上下文类型
 */
export class TaskChainBuilder<TContext = Record<string, never>> {
  private tasks: Array<{
    fn: TaskFunction<any, any>;
    config: TaskConfig;
  }> = [];

  // 任务控制方法（由 scheduler 注入）
  public pause: () => void = () => {};
  public resume: () => void = () => {};
  public stop: () => void = () => {};

  constructor(private readonly jobRef?: { current: InternalCronJob | null }) {}

  /**
   * 开始任务链 - 第一个任务
   * @param fn - 任务函数,返回初始数据
   * @param config - 任务配置
   */
  do<TReturn>(
    fn: TaskFunction<TContext, TReturn>,
    config: TaskConfig = {}
  ): TaskChainBuilder<TContext & TReturn> {
    return this.addTask(fn, config);
  }

  /**
   * 添加后续任务
   * @param fn - 任务函数,接收累积的上下文,返回新数据
   * @param config - 任务配置
   */
  then<TReturn>(
    fn: TaskFunction<TContext, TReturn>,
    config: TaskConfig = {}
  ): TaskChainBuilder<TContext & TReturn> {
    return this.addTask(fn, config);
  }

  /**
   * 内部方法：添加任务到链中
   */
  private addTask<TReturn>(
    fn: TaskFunction<TContext, TReturn>,
    config: TaskConfig
  ): TaskChainBuilder<TContext & TReturn> {
    const newChain = new TaskChainBuilder<TContext & TReturn>(this.jobRef);
    newChain.tasks = [...this.tasks, { fn, config }];

    // 复制任务控制方法
    newChain.pause = this.pause;
    newChain.resume = this.resume;
    newChain.stop = this.stop;

    // 如果有任务引用，更新任务链并通知调度
    if (this.jobRef?.current) {
      this.jobRef.current.taskChain = newChain;
      // 触发首次调度（如果是第一个任务）
      this.jobRef.current.onTaskAdded?.();
    }

    return newChain;
  }

  /**
   * 执行任务链
   * @param initialContext - 初始上下文(可选)
   * @returns 最终累积的上下文
   */
  async execute(
    initialContext: Partial<TContext> = {}
  ): Promise<TContext | null> {
    let context: any = { ...initialContext };

    for (let i = 0; i < this.tasks.length; i++) {
      const { fn, config } = this.tasks[i];

      try {
        const result = await fn(context);

        // 合并返回值到上下文
        if (result !== null && result !== undefined) {
          if (typeof result === "object" && !Array.isArray(result)) {
            context = { ...context, ...result };
          }
        }
      } catch (error) {
        if (config.continueOnError) {
          // 继续执行下一个任务
          continue;
        } else {
          // 抛出错误,中断执行
          throw new Error(
            `Task ${config.name || i} failed: ${error instanceof Error ? error.message : String(error)}`
          );
        }
      }
    }

    return context;
  }

  /**
   * 获取任务数量
   */
  get length(): number {
    return this.tasks.length;
  }

  /**
   * 克隆任务链
   */
  clone(): TaskChainBuilder<TContext> {
    const newChain = new TaskChainBuilder<TContext>(this.jobRef);
    newChain.tasks = [...this.tasks];
    return newChain;
  }
}

/**
 * 内部任务作业类型（包含完整信息）
 */
export interface InternalCronJob {
  id: string;
  cron: string;
  taskChain: TaskChainBuilder<any>;
  nextRun: Date;
  timer?: Timer;
  running: boolean;
  paused: boolean;
  onPause?: () => void;
  onResume?: () => void;
  onStop?: () => void;
  onTaskAdded?: () => void;
}
