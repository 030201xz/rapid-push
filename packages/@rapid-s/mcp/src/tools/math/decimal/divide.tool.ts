import 'reflect-metadata';
import { injectable } from 'tsyringe';
import {
  BaseTool,
  Tool,
  type ToolContext,
  type ToolOptions,
  type ToolResult,
} from '../../../core/index.ts';
import {
  calculationOutputSchema,
  createCalculationOutput,
  twoNumbersInputSchema,
  validateNumber,
  type CalculationOutput,
  type TwoNumbersInput,
} from '../../../shared/decimal-utils.ts';

/** 高精度除法工具 */
@injectable()
@Tool()
export class DivideTool extends BaseTool<
  typeof twoNumbersInputSchema,
  typeof calculationOutputSchema,
  TwoNumbersInput,
  CalculationOutput
> {
  override getOptions(): ToolOptions<
    typeof twoNumbersInputSchema,
    typeof calculationOutputSchema
  > {
    return {
      name: 'decimal_divide',
      title: 'High-Precision Division', // 高精度除法
      description:
        'Perform division with arbitrary precision, handling fractional results accurately without losing precision, and detecting division by zero errors', // 执行任意精度的除法，准确处理分数结果并检测除零错误
      inputSchema: twoNumbersInputSchema,
      outputSchema: calculationOutputSchema,
    };
  }

  override async execute(
    input: TwoNumbersInput,
    _context: ToolContext
  ): Promise<ToolResult<CalculationOutput>> {
    const numA = validateNumber(input.a, 'a');
    const numB = validateNumber(input.b, 'b');

    // 检查除数是否为零
    if (numB.isZero()) {
      return {
        success: false,
        error: '除数不能为零',
      };
    }

    const result = numA.dividedBy(numB);

    return {
      success: true,
      data: createCalculationOutput('÷', input.a, input.b, result),
    };
  }
}
