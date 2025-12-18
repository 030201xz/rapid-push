import "reflect-metadata";
import { injectable } from "tsyringe";
import {
  BaseTool,
  Tool,
  type ToolContext,
  type ToolOptions,
  type ToolResult,
} from "../core/index.ts";
import {
  calculationOutputSchema,
  createCalculationOutput,
  twoNumbersInputSchema,
  validateNumber,
  type CalculationOutput,
  type TwoNumbersInput,
} from "../shared/decimal-utils.ts";
import { createLogger } from "../shared/logger.ts";

const log = createLogger("tool:add");

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
      name: "ignore_demo_tool",
      title: "忽略示例工具",
      description: "高精度加法运算",
      inputSchema: twoNumbersInputSchema,
      outputSchema: calculationOutputSchema,
    };
  }

  override async onInit(): Promise<void> {
    log.debug("初始化中...");
  }

  override async onReady(): Promise<void> {
    log.debug("已就绪");
  }

  override async execute(
    input: TwoNumbersInput,
    _context: ToolContext
  ): Promise<ToolResult<CalculationOutput>> {
    const numA = validateNumber(input.a, "a");
    const numB = validateNumber(input.b, "b");
    const result = numA.plus(numB);

    return {
      success: true,
      data: createCalculationOutput("+", input.a, input.b, result),
    };
  }
}
