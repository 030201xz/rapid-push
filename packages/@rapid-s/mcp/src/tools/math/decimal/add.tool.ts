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
import { createLogger } from '../../../shared/logger.ts';

const log = createLogger('tool:add');

/** 高精度加法工具 */
@injectable()
@Tool()
export class AddTool extends BaseTool<
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
      name: 'decimal_add',
      // 高精度加法
      title: 'High-Precision Addition',
      // 执行任意精度的加法，准确处理小数而不会出现浮点误差
      description:
        'Perform addition with arbitrary precision, handling decimal numbers accurately without floating-point errors',
      inputSchema: twoNumbersInputSchema,
      outputSchema: calculationOutputSchema,
    };
  }

  override async onInit(): Promise<void> {
    log.debug('初始化中...');
  }

  override async onReady(): Promise<void> {
    log.debug('已就绪');
  }

  override async execute(
    input: TwoNumbersInput,
    _context: ToolContext
  ): Promise<ToolResult<CalculationOutput>> {
    const numA = validateNumber(input.a, 'a');
    const numB = validateNumber(input.b, 'b');
    const result = numA.plus(numB);

    return {
      success: true,
      data: createCalculationOutput('+', input.a, input.b, result),
    };
  }
}
