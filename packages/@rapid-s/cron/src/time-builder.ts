import type { JobBuilder } from "./job-builder";
import type { TimeUnit } from "./types";

/**
 * 时间构建器 - 提供自然语言风格的时间表达
 *
 * @example
 * ```ts
 * cron.every(5).seconds()
 * cron.every(1).minute()
 * cron.every(2).hours()
 * ```
 */
export class TimeBuilder {
  constructor(
    private readonly createJobBuilder: (cron: string) => JobBuilder,
    private readonly value: number
  ) {}

  /**
   * 每 N 秒
   */
  seconds(): JobBuilder {
    return this.createJobBuilder(this.buildCronExpression("second"));
  }

  /**
   * 每 N 秒（别名）
   */
  second(): JobBuilder {
    return this.seconds();
  }

  /**
   * 每 N 分钟
   */
  minutes(): JobBuilder {
    return this.createJobBuilder(this.buildCronExpression("minute"));
  }

  /**
   * 每 N 分钟（别名）
   */
  minute(): JobBuilder {
    return this.minutes();
  }

  /**
   * 每 N 小时
   */
  hours(): JobBuilder {
    return this.createJobBuilder(this.buildCronExpression("hour"));
  }

  /**
   * 每 N 小时（别名）
   */
  hour(): JobBuilder {
    return this.hours();
  }

  /**
   * 每 N 天
   */
  days(): JobBuilder {
    return this.createJobBuilder(this.buildCronExpression("day"));
  }

  /**
   * 每 N 天（别名）
   */
  day(): JobBuilder {
    return this.days();
  }

  /**
   * 根据时间单位构建 CRON 表达式
   */
  private buildCronExpression(unit: TimeUnit): string {
    switch (unit) {
      case "second":
        // 每 N 秒: */N * * * * *
        return `*/${this.value} * * * * *`;
      case "minute":
        // 每 N 分钟: 0 */N * * * *
        return `0 */${this.value} * * * *`;
      case "hour":
        // 每 N 小时: 0 0 */N * * *
        return `0 0 */${this.value} * * *`;
      case "day":
        // 每 N 天: 0 0 0 */N * *
        return `0 0 0 */${this.value} * *`;
      default:
        throw new Error(`Unsupported time unit: ${unit}`);
    }
  }
}
