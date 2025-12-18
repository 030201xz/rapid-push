import 'reflect-metadata';
import { injectable } from 'tsyringe';
import {
  BaseTool,
  Tool,
  type ToolContext,
  type ToolOptions,
  type ToolResult,
} from '../../../core/index.ts';
import { Decimal, z } from '../../../shared/decimal-utils.ts';

/** 表达式输入 schema */
const evalInputSchema = {
  expression: z.string().describe("数学表达式，如 '(1.1 + 2.2) * 3.3'"),
};

/** 表达式输出 schema */
const evalOutputSchema = {
  result: z.string().describe('计算结果'),
  expression: z.string().describe('原始表达式'),
};

/** 输入类型 */
type EvalInput = z.infer<z.ZodObject<typeof evalInputSchema>>;

/** 输出类型 */
type EvalOutput = z.infer<z.ZodObject<typeof evalOutputSchema>>;

/** 高精度表达式计算工具 */
@injectable()
@Tool()
export class EvalTool extends BaseTool<
  typeof evalInputSchema,
  typeof evalOutputSchema,
  EvalInput,
  EvalOutput
> {
  override getOptions(): ToolOptions<
    typeof evalInputSchema,
    typeof evalOutputSchema
  > {
    return {
      name: 'decimal_eval',
      title: 'High-Precision Expression Evaluator', // 高精度表达式计算
      description:
        'Evaluate complex mathematical expressions with arbitrary precision, supporting +, -, *, /, ^ operators and parentheses for complex calculations', // 计算复杂的数学表达式，支持 +、-、*、/、^ 运算符和括号，提供任意精度
      inputSchema: evalInputSchema,
      outputSchema: evalOutputSchema,
    };
  }

  override async execute(
    input: EvalInput,
    _context: ToolContext
  ): Promise<ToolResult<EvalOutput>> {
    try {
      const result = this.evaluateExpression(input.expression);

      return {
        success: true,
        data: {
          result: result.toString(),
          expression: input.expression,
        },
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : '计算错误';
      return {
        success: false,
        error: message,
      };
    }
  }

  /**
   * 安全的表达式解析器
   * 支持: +, -, *, /, ^, ()
   */
  private evaluateExpression(expr: string): Decimal {
    // 移除空格
    expr = expr.replace(/\s+/g, '');

    // 验证表达式只包含合法字符
    if (!/^[\d.+\-*/^()e]+$/i.test(expr)) {
      throw new Error('表达式包含非法字符');
    }

    return this.parseExpression(expr);
  }

  /** 递归下降解析器 */
  private parseExpression(expr: string): Decimal {
    let pos = 0;

    const currentChar = (): string | undefined => expr[pos];
    const nextChar = (): string | undefined => expr[pos + 1];

    const parseNumber = (): Decimal => {
      let numStr = '';

      // 处理负号
      if (currentChar() === '-') {
        numStr += '-';
        pos++;
      }

      // 读取数字（包括小数点和科学计数法）
      while (pos < expr.length) {
        const char = currentChar();
        if (char === undefined) break;

        const isDigitOrDot = /[\d.]/.test(char);
        const isExponent =
          char.toLowerCase() === 'e' &&
          (nextChar() === '+' ||
            nextChar() === '-' ||
            (nextChar() !== undefined && /\d/.test(nextChar()!)));

        if (!isDigitOrDot && !isExponent) break;

        numStr += char;
        pos++;

        // 处理科学计数法的符号
        if (numStr.toLowerCase().endsWith('e')) {
          const sign = currentChar();
          if (sign === '+' || sign === '-') {
            numStr += sign;
            pos++;
          }
        }
      }

      if (!numStr || numStr === '-') {
        throw new Error(`位置 ${pos} 处期望数字`);
      }

      return new Decimal(numStr);
    };

    const parseFactor = (): Decimal => {
      if (currentChar() === '(') {
        pos++;
        const result = parseAddSub();
        if (currentChar() !== ')') {
          throw new Error('缺少右括号');
        }
        pos++;
        return result;
      }
      return parseNumber();
    };

    const parsePower = (): Decimal => {
      let left = parseFactor();

      while (pos < expr.length && currentChar() === '^') {
        pos++;
        const right = parseFactor();
        left = left.pow(right);
      }

      return left;
    };

    const parseMulDiv = (): Decimal => {
      let left = parsePower();

      while (
        pos < expr.length &&
        (currentChar() === '*' || currentChar() === '/')
      ) {
        const op = currentChar();
        pos++;
        const right = parsePower();

        if (op === '*') {
          left = left.times(right);
        } else {
          if (right.isZero()) {
            throw new Error('除数不能为零');
          }
          left = left.dividedBy(right);
        }
      }

      return left;
    };

    const parseAddSub = (): Decimal => {
      let left = parseMulDiv();

      while (
        pos < expr.length &&
        (currentChar() === '+' || currentChar() === '-')
      ) {
        const op = currentChar();
        pos++;
        const right = parseMulDiv();

        if (op === '+') {
          left = left.plus(right);
        } else {
          left = left.minus(right);
        }
      }

      return left;
    };

    const result = parseAddSub();

    if (pos < expr.length) {
      throw new Error(`位置 ${pos} 处有未解析的字符: "${currentChar()}"`);
    }

    return result;
  }
}
