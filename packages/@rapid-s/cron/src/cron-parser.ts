import type { CronExpression } from "./types";

/**
 * CRON 表达式解析器
 * 支持标准 5 段式: 分 时 日 月 周
 * 支持扩展 6 段式: 秒 分 时 日 月 周
 */
export class CronParser {
  /**
   * 解析 CRON 表达式
   */
  static parse(expression: string): CronExpression {
    const parts = expression.trim().split(/\s+/);

    if (parts.length !== 5 && parts.length !== 6) {
      throw new Error(
        `Invalid CRON expression: ${expression}, must be 5-field (min hour day month weekday) or 6-field (sec min hour day month weekday)`
      );
    }

    // 6 段式: 秒 分 时 日 月 周
    if (parts.length === 6) {
      const [second, minute, hour, day, month, weekday] = parts;
      return {
        expression,
        fields: {
          second: this.parseField(second, 0, 59),
          minute: this.parseField(minute, 0, 59),
          hour: this.parseField(hour, 0, 23),
          day: this.parseField(day, 1, 31),
          month: this.parseField(month, 1, 12),
          weekday: this.parseField(weekday, 0, 6),
        },
      };
    }

    // 5 段式: 分 时 日 月 周
    const [minute, hour, day, month, weekday] = parts;
    return {
      expression,
      fields: {
        minute: this.parseField(minute, 0, 59),
        hour: this.parseField(hour, 0, 23),
        day: this.parseField(day, 1, 31),
        month: this.parseField(month, 1, 12),
        weekday: this.parseField(weekday, 0, 6),
      },
    };
  }

  /**
   * 解析单个字段
   * 支持: * / - , 等语法
   */
  private static parseField(field: string, min: number, max: number): number[] {
    // 通配符 *
    if (field === "*") {
      return this.range(min, max);
    }

    const values = new Set<number>();

    // 处理逗号分隔的多个值
    const parts = field.split(",");

    for (const part of parts) {
      // 处理步长 */5 或 1-10/2
      if (part.includes("/")) {
        const [rangePart, stepPart] = part.split("/");
        const step = parseInt(stepPart, 10);

        if (isNaN(step) || step <= 0) {
          throw new Error(`Invalid step value: ${stepPart}`);
        }

        let rangeValues: number[];
        if (rangePart === "*") {
          rangeValues = this.range(min, max);
        } else if (rangePart.includes("-")) {
          const [start, end] = rangePart.split("-").map(Number);
          rangeValues = this.range(start, end);
        } else {
          rangeValues = [parseInt(rangePart, 10)];
        }

        rangeValues
          .filter((_, i) => i % step === 0)
          .forEach((v) => values.add(v));
      }
      // 处理范围 1-5
      else if (part.includes("-")) {
        const [start, end] = part.split("-").map(Number);
        if (isNaN(start) || isNaN(end)) {
          throw new Error(`Invalid range: ${part}`);
        }
        this.range(start, end).forEach((v) => values.add(v));
      }
      // 单个数字
      else {
        const value = parseInt(part, 10);
        if (isNaN(value)) {
          throw new Error(`Invalid value: ${part}`);
        }
        values.add(value);
      }
    }

    // 验证范围
    const result = Array.from(values).sort((a, b) => a - b);
    for (const value of result) {
      if (value < min || value > max) {
        throw new Error(`Value ${value} out of range [${min}, ${max}]`);
      }
    }

    return result;
  }

  /**
   * 生成数字范围数组
   */
  private static range(start: number, end: number): number[] {
    const result: number[] = [];
    for (let i = start; i <= end; i++) {
      result.push(i);
    }
    return result;
  }

  /**
   * 计算下次执行时间
   */
  static getNextRunTime(
    expression: CronExpression,
    from: Date = new Date()
  ): Date {
    const { fields } = expression;
    const next = new Date(from);
    const hasSecond = fields.second !== undefined;

    // 6 段式: 从下一秒开始
    if (hasSecond) {
      next.setMilliseconds(0);
      next.setSeconds(next.getSeconds() + 1);
    } else {
      // 5 段式: 从下一分钟开始
      next.setSeconds(0);
      next.setMilliseconds(0);
      next.setMinutes(next.getMinutes() + 1);
    }

    // 最多向前查找 4 年
    const maxIterations = hasSecond ? 365 * 24 * 60 * 60 : 365 * 24 * 60 * 4;
    let iterations = 0;

    while (iterations < maxIterations) {
      const second = next.getSeconds();
      const minute = next.getMinutes();
      const hour = next.getHours();
      const day = next.getDate();
      const month = next.getMonth() + 1;
      const weekday = next.getDay();

      // 检查是否匹配所有字段
      const secondMatch = !hasSecond || fields.second!.includes(second);
      if (
        secondMatch &&
        fields.minute.includes(minute) &&
        fields.hour.includes(hour) &&
        fields.day.includes(day) &&
        fields.month.includes(month) &&
        fields.weekday.includes(weekday)
      ) {
        return next;
      }

      // 未匹配,前进到下一秒或下一分钟
      if (hasSecond) {
        next.setSeconds(next.getSeconds() + 1);
      } else {
        next.setMinutes(next.getMinutes() + 1);
      }
      iterations++;
    }

    throw new Error(`Cannot calculate next run time: ${expression.expression}`);
  }

  /**
   * 验证 CRON 表达式格式
   */
  static validate(expression: string): boolean {
    try {
      this.parse(expression);
      return true;
    } catch {
      return false;
    }
  }
}
