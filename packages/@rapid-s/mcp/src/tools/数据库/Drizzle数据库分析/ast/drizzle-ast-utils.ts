/**
 * Drizzle AST 工具函数
 * 提供 Drizzle Schema 特定的 AST 解析工具
 */
import ts from "typescript";

// ============================================================================
// JSDoc 提取
// ============================================================================

/**
 * 从 AST 节点获取 JSDoc 注释
 * 优先使用 Symbol API，回退到源码正则提取
 */
export function getJSDocComment(node: ts.Node): string | undefined {
  // 尝试通过 Symbol API 获取
  const symbol = (node as { symbol?: ts.Symbol }).symbol;
  if (symbol) {
    const docs = symbol.getDocumentationComment(undefined);
    if (docs && docs.length > 0) {
      return docs.map((d) => d.text).join("");
    }
  }

  // 回退：从源码中提取 /** ... */ 形式的注释
  const sourceFile = node.getSourceFile();
  const fullText = sourceFile.getFullText();
  const commentRanges = ts.getLeadingCommentRanges(
    fullText,
    node.getFullStart()
  );

  if (commentRanges && commentRanges.length > 0) {
    for (const range of commentRanges) {
      const comment = fullText.slice(range.pos, range.end);
      // 匹配 JSDoc 格式
      const match = comment.match(/\/\*\*\s*\n?\s*\*?\s*(.+?)\s*\*?\s*\*\//s);
      if (match) {
        return match[1].replace(/^\s*\*\s*/gm, "").trim();
      }
    }
  }

  return undefined;
}

/**
 * 从源文件开头提取文件级 JSDoc
 */
export function getFileJSDoc(sourceFile: ts.SourceFile): string | undefined {
  const fullText = sourceFile.getFullText();
  
  // 匹配文件开头的 JSDoc 注释块
  const match = fullText.match(/^\s*\/\*\*\s*([\s\S]*?)\s*\*\//);
  if (match) {
    // 清理注释格式，移除每行开头的 * 符号
    return match[1]
      .split("\n")
      .map((line) => line.replace(/^\s*\*\s?/, "").trim())
      .filter((line) => line.length > 0)
      .join("\n");
  }

  return undefined;
}

/**
 * 从属性节点获取行内注释
 */
export function getInlineComment(
  node: ts.Node,
  sourceFile: ts.SourceFile
): string | undefined {
  const fullText = sourceFile.getFullText();
  const nodeStart = node.getStart(sourceFile);
  
  // 查找节点前的注释
  const commentRanges = ts.getLeadingCommentRanges(fullText, node.getFullStart());
  
  if (commentRanges && commentRanges.length > 0) {
    // 取最后一个注释（最靠近节点的）
    const lastRange = commentRanges[commentRanges.length - 1];
    const comment = fullText.slice(lastRange.pos, lastRange.end);
    
    // 匹配 /** ... */ 单行 JSDoc
    const singleLineMatch = comment.match(/\/\*\*\s*(.+?)\s*\*\//);
    if (singleLineMatch) {
      return singleLineMatch[1].trim();
    }
    
    // 匹配多行 JSDoc
    const multiLineMatch = comment.match(/\/\*\*\s*([\s\S]*?)\s*\*\//);
    if (multiLineMatch) {
      return multiLineMatch[1]
        .split("\n")
        .map((line) => line.replace(/^\s*\*\s?/, "").trim())
        .filter((line) => line.length > 0)
        .join(" ");
    }
  }
  
  return undefined;
}

// ============================================================================
// 类型映射
// ============================================================================

/**
 * Drizzle 类型到 TypeScript 类型的映射
 */
const DRIZZLE_TO_TS_TYPE_MAP: Record<string, string> = {
  // 字符串类型
  uuid: "string",
  varchar: "string",
  char: "string",
  text: "string",
  citext: "string",
  
  // 数字类型
  integer: "number",
  smallint: "number",
  bigint: "string", // bigint 在 JS 中可能超出 number 范围
  serial: "number",
  smallserial: "number",
  bigserial: "string",
  real: "number",
  doublePrecision: "number",
  numeric: "string", // 高精度数字用 string
  decimal: "string",
  
  // 布尔类型
  boolean: "boolean",
  
  // 日期时间类型
  timestamp: "Date",
  timestamptz: "Date",
  date: "string",
  time: "string",
  timetz: "string",
  interval: "string",
  
  // JSON 类型
  json: "unknown",
  jsonb: "unknown",
  
  // 其他类型
  bytea: "Buffer",
  inet: "string",
  cidr: "string",
  macaddr: "string",
  point: "{ x: number; y: number }",
  line: "string",
  path: "string",
  polygon: "string",
  circle: "string",
  box: "string",
  
  // 数组类型标记
  array: "unknown[]",
};

/**
 * 将 Drizzle 数据类型映射为 TypeScript 类型
 */
export function mapDrizzleTypeToTS(drizzleType: string): string {
  const normalizedType = drizzleType.toLowerCase();
  return DRIZZLE_TO_TS_TYPE_MAP[normalizedType] ?? "unknown";
}

// ============================================================================
// 调用链分析
// ============================================================================

/**
 * 链式调用信息
 */
export interface ChainCallInfo {
  /** 方法名称 */
  methodName: string;
  /** 方法参数 */
  arguments: ts.NodeArray<ts.Expression> | undefined;
}

/**
 * 解析链式调用表达式
 * 例如: uuid('id').primaryKey().defaultRandom()
 * 返回: [{ methodName: 'uuid', args: ['id'] }, { methodName: 'primaryKey', args: [] }, ...]
 */
export function parseChainCalls(
  expression: ts.Expression,
  sourceFile: ts.SourceFile
): ChainCallInfo[] {
  const chain: ChainCallInfo[] = [];
  
  let current: ts.Expression = expression;
  
  while (ts.isCallExpression(current)) {
    const callExpr = current;
    
    if (ts.isPropertyAccessExpression(callExpr.expression)) {
      // 链式调用：xxx.method()
      chain.unshift({
        methodName: callExpr.expression.name.getText(sourceFile),
        arguments: callExpr.arguments,
      });
      current = callExpr.expression.expression;
    } else if (ts.isIdentifier(callExpr.expression)) {
      // 首个调用：method()
      chain.unshift({
        methodName: callExpr.expression.getText(sourceFile),
        arguments: callExpr.arguments,
      });
      break;
    } else {
      break;
    }
  }
  
  return chain;
}

/**
 * 从参数中提取字符串字面量
 */
export function extractStringLiteral(
  args: ts.NodeArray<ts.Expression> | undefined,
  index: number,
  sourceFile: ts.SourceFile
): string | undefined {
  if (!args || args.length <= index) return undefined;
  
  const arg = args[index];
  if (ts.isStringLiteral(arg)) {
    return arg.text;
  }
  
  return undefined;
}

/**
 * 从参数中提取对象字面量的属性
 */
export function extractObjectProperty(
  args: ts.NodeArray<ts.Expression> | undefined,
  argIndex: number,
  propertyName: string,
  sourceFile: ts.SourceFile
): ts.Expression | undefined {
  if (!args || args.length <= argIndex) return undefined;
  
  const arg = args[argIndex];
  if (!ts.isObjectLiteralExpression(arg)) return undefined;
  
  for (const prop of arg.properties) {
    if (
      ts.isPropertyAssignment(prop) &&
      ts.isIdentifier(prop.name) &&
      prop.name.text === propertyName
    ) {
      return prop.initializer;
    }
  }
  
  return undefined;
}

/**
 * 从表达式提取数字字面量
 */
export function extractNumberLiteral(
  expr: ts.Expression | undefined
): number | undefined {
  if (!expr) return undefined;
  
  if (ts.isNumericLiteral(expr)) {
    return Number(expr.text);
  }
  
  return undefined;
}

// ============================================================================
// 行号工具
// ============================================================================

/**
 * 获取节点的行号（1-based）
 */
export function getLineNumber(
  node: ts.Node,
  sourceFile: ts.SourceFile
): number {
  const { line } = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
  return line + 1; // 转为 1-based
}
