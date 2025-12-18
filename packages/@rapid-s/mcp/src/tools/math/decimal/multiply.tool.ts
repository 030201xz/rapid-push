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

/** 高精度乘法工具 */
@injectable()
@Tool()
export class MultiplyTool extends BaseTool<
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
      name: 'decimal_multiply',
      title: 'High-Precision Multiplication', // 高精度乘法
      description:
        'Perform multiplication with arbitrary precision, ensuring accurate results for decimal numbers without precision loss', // 执行任意精度的乘法，确保十进制数字的准确结果而不会精度丢失
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
    const result = numA.times(numB);

    return {
      success: true,
      data: createCalculationOutput('×', input.a, input.b, result),
    };
  }
}
