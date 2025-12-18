import Decimal from "decimal.js";
import { z } from "zod";

// 配置 Decimal.js 精度
Decimal.set({
  precision: 50, // 50 位有效数字
  rounding: Decimal.ROUND_HALF_UP, // 四舍五入
});

/** 通用双数值输入 schema */
export const twoNumbersInputSchema = {
  a: z.string().describe("第一个数值（字符串格式，支持高精度）"),
  b: z.string().describe("第二个数值（字符串格式，支持高精度）"),
};

/** 通用计算输出 schema */
export const calculationOutputSchema = {
  result: z.string().describe("计算结果"),
  expression: z.string().describe("计算表达式"),
};

/** 双数值输入类型 */
export type TwoNumbersInput = z.infer<
  z.ZodObject<typeof twoNumbersInputSchema>
>;

/** 计算输出类型 */
export type CalculationOutput = z.infer<
  z.ZodObject<typeof calculationOutputSchema>
>;

/** 验证数值有效性 */
export function validateNumber(value: string, paramName: string): Decimal {
  try {
    return new Decimal(value);
  } catch {
    throw new Error(`参数 ${paramName} 不是有效的数值: "${value}"`);
  }
}

/** 创建计算输出 */
export function createCalculationOutput(
  operation: string,
  a: string,
  b: string,
  result: Decimal
): CalculationOutput {
  return {
    result: result.toString(),
    expression: `${a} ${operation} ${b}`,
  };
}

/** 重新导出 Decimal 和 z */
export { Decimal, z };
