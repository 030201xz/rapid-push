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
  twoNumbersInputSchema,
  validateNumber,
  z,
  type TwoNumbersInput,
} from '../../../shared/decimal-utils.ts';

/** 比较输出 schema */
const compareOutputSchema = {
  comparison: z.string().describe('比较结果（>、<、=）'),
  difference: z.string().describe('差值'),
};

/** 比较输出类型 */
type CompareOutput = z.infer<z.ZodObject<typeof compareOutputSchema>>;

/** 高精度数值比较工具 */
@injectable()
@Tool()
export class CompareTool extends BaseTool<
  typeof twoNumbersInputSchema,
  typeof compareOutputSchema,
  TwoNumbersInput,
  CompareOutput
> {
  override getOptions(): ToolOptions<
    typeof twoNumbersInputSchema,
    typeof compareOutputSchema
  > {
    return {
      name: 'decimal_compare',
      // 高精度数值比较
      title: 'High-Precision Number Comparison',
      // 比较两个数字的大小关系并返回其差值，支持任意精度
      description:
        'Compare two numbers with arbitrary precision and return their relationship (greater than, less than, equal) along with the difference',
      inputSchema: twoNumbersInputSchema,
      outputSchema: compareOutputSchema,
    };
  }

  override async execute(
    input: TwoNumbersInput,
    _context: ToolContext
  ): Promise<ToolResult<CompareOutput>> {
    const numA = validateNumber(input.a, 'a');
    const numB = validateNumber(input.b, 'b');
    const cmp = numA.comparedTo(numB);

    let comparison: string;
    if (cmp > 0) {
      comparison = `${input.a} > ${input.b}`;
    } else if (cmp < 0) {
      comparison = `${input.a} < ${input.b}`;
    } else {
      comparison = `${input.a} = ${input.b}`;
    }

    return {
      success: true,
      data: {
        comparison,
        difference: numA.minus(numB).toString(),
      },
    };
  }
}
