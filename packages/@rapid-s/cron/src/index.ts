import { Cron, type CronConfig } from "./scheduler";

export { CronParser } from "./cron-parser";
export { JobBuilder } from "./job-builder";
export { TaskChain } from "./task-chain";
export { TaskChainBuilder } from "./task-chain-builder";
export { TimeBuilder } from "./time-builder";
export type {
  CronExpression,
  CronFields,
  CronJob,
  TaskConfig,
  TaskFunction,
  TimeUnit,
} from "./types";
export { Cron, type CronConfig };

/**
 * 创建一个 CRON 调度器实例
 * @param config - 调度器配置
 * @returns Cron 实例
 *
 * @example
 * ```ts
 * const cron = createCron();
 *
 * // 自然语言风格
 * cron.every(5).seconds().do(() => {
 *   console.log("Every 5 seconds");
 * });
 *
 * // CRON 表达式
 * cron.cron("*\/5 * * * * *").do(() => {
 *   console.log("Custom cron");
 * });
 * ```
 */
export function createCron(config?: CronConfig) {
  return new Cron(config);
}

/**
 * 默认的 CRON 调度器实例
 * 使用默认配置（autoStart: true）
 *
 * @example
 * ```ts
 * import { cron } from "@x/cron";
 *
 * // 自然语言风格
 * cron.every(5).seconds().do(() => {
 *   console.log("Every 5 seconds");
 * });
 *
 * // CRON 表达式
 * cron.every("*\/5 * * * * *").do(() => {
 *   console.log("Custom cron");
 * });
 * ```
 */
export const cron = createCron();
