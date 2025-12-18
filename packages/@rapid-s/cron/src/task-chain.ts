import type { TaskFunction, TaskConfig } from "./types";

/**
 * 类型安全的任务链
 * 支持链式调用,自动累积上下文类型
 */
export class TaskChain<TContext = Record<string, never>> {
  private tasks: Array<{
    fn: TaskFunction<any, any>;
    config: TaskConfig;
  }> = [];

  /**
   * 添加任务到链中
   * @param fn - 任务函数,接收累积的上下文,返回新数据
   * @param config - 任务配置
   * @returns 新的 TaskChain 实例,上下文类型已更新
   */
  task<TReturn>(
    fn: TaskFunction<TContext, TReturn>,
    config: TaskConfig = {}
  ): TaskChain<TContext & TReturn> {
    const newChain = new TaskChain<TContext & TReturn>();
    newChain.tasks = [...this.tasks, { fn, config }];
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
  clone(): TaskChain<TContext> {
    const newChain = new TaskChain<TContext>();
    newChain.tasks = [...this.tasks];
    return newChain;
  }
}
