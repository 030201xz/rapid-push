/**
 * 索引解析器
 * 解析 Drizzle Schema 中的索引定义
 */
import ts from "typescript";

import { getLineNumber } from "../ast";
import type { IndexInfo } from "../types";

// ============================================================================
// 索引方法集合
// ============================================================================

/** 索引创建方法 */
const INDEX_METHODS = new Set(["index", "uniqueIndex"]);

// ============================================================================
// 索引解析
// ============================================================================

/**
 * 从索引调用中提取索引名称
 */
function extractIndexName(
  callExpr: ts.CallExpression,
  sourceFile: ts.SourceFile
): string | undefined {
  if (callExpr.arguments.length === 0) return undefined;

  const firstArg = callExpr.arguments[0];
  if (ts.isStringLiteral(firstArg)) {
    return firstArg.text;
  }

  return undefined;
}

/**
 * 从 .on() 调用中提取索引字段
 */
function extractIndexColumns(
  callExpr: ts.CallExpression,
  sourceFile: ts.SourceFile
): string[] {
  const columns: string[] = [];

  // 查找 .on() 调用
  let current: ts.Expression = callExpr;

  while (ts.isCallExpression(current)) {
    if (ts.isPropertyAccessExpression(current.expression)) {
      const methodName = current.expression.name.getText(sourceFile);

      if (methodName === "on") {
        // 提取 on() 的参数
        for (const arg of current.arguments) {
          // 参数可能是 t.columnName 形式
          if (ts.isPropertyAccessExpression(arg)) {
            columns.push(arg.name.getText(sourceFile));
          }
        }
      }

      current = current.expression.expression;
    } else {
      break;
    }
  }

  return columns;
}

/**
 * 解析单个索引定义
 */
export function parseIndexDefinition(
  expression: ts.Expression,
  sourceFile: ts.SourceFile
): IndexInfo | undefined {
  if (!ts.isCallExpression(expression)) return undefined;

  // 查找根调用方法名
  let rootCall = expression;
  let methodName = "";

  // 遍历链式调用找到根方法
  let current: ts.Expression = expression;
  while (ts.isCallExpression(current)) {
    const callExpr = current;

    if (ts.isPropertyAccessExpression(callExpr.expression)) {
      current = callExpr.expression.expression;
    } else if (ts.isIdentifier(callExpr.expression)) {
      methodName = callExpr.expression.getText(sourceFile);
      rootCall = callExpr;
      break;
    } else {
      break;
    }
  }

  if (!INDEX_METHODS.has(methodName)) return undefined;

  // 提取索引名称
  const indexName = extractIndexName(rootCall, sourceFile);

  // 提取索引字段
  const columns = extractIndexColumns(expression, sourceFile);

  // 是否唯一索引
  const isUnique = methodName === "uniqueIndex";

  // 行号
  const lineNumber = getLineNumber(expression, sourceFile);

  return {
    indexName,
    columns,
    isUnique,
    lineNumber,
  };
}

/**
 * 从索引回调函数中解析所有索引
 */
export function parseIndexesFromCallback(
  callback: ts.ArrowFunction | ts.FunctionExpression,
  sourceFile: ts.SourceFile
): IndexInfo[] {
  const indexes: IndexInfo[] = [];

  // 回调函数体可能是数组表达式或块语句
  const body = callback.body;

  if (ts.isArrayLiteralExpression(body)) {
    // 箭头函数直接返回数组: t => [index(...), ...]
    for (const element of body.elements) {
      const indexInfo = parseIndexDefinition(element, sourceFile);
      if (indexInfo) {
        indexes.push(indexInfo);
      }
    }
  } else if (ts.isBlock(body)) {
    // 块语句: t => { return [...]; }
    for (const statement of body.statements) {
      if (ts.isReturnStatement(statement) && statement.expression) {
        if (ts.isArrayLiteralExpression(statement.expression)) {
          for (const element of statement.expression.elements) {
            const indexInfo = parseIndexDefinition(element, sourceFile);
            if (indexInfo) {
              indexes.push(indexInfo);
            }
          }
        }
      }
    }
  }

  return indexes;
}
