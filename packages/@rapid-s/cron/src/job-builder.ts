import { TaskChainBuilder } from "./task-chain-builder";
import type { TaskFunction } from "./types";

/**
 * 任务构建器 - 用于配置和启动任务
 */
export class JobBuilder {
  constructor(
    private readonly cronExpression: string,
    private readonly createJobWithChain: (
      cron: string
    ) => TaskChainBuilder<Record<string, never>>
  ) {}

  /**
   * 开始任务链
   * @param task - 任务函数
   */
  do<TReturn>(
    task: TaskFunction<Record<string, never>, TReturn>
  ): TaskChainBuilder<TReturn> {
    const chain = this.createJobWithChain(this.cronExpression);
    return chain.do(task);
  }
}
