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

/** 高精度减法工具 */
@injectable()
@Tool()
export class SubtractTool extends BaseTool<
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
      name: 'decimal_subtract',
      title: 'High-Precision Subtraction', // 高精度减法
      description:
        'Perform subtraction with arbitrary precision, handling decimal numbers accurately to prevent floating-point errors', // 执行任意精度的减法，准确处理小数以防止浮点误差
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
    const result = numA.minus(numB);

    return {
      success: true,
      data: createCalculationOutput('-', input.a, input.b, result),
    };
  }
}
