/**
 * 表定义解析器
 * 解析 Drizzle Schema 中的表定义
 */
import path from "node:path";
import ts from "typescript";

import { getFileJSDoc, getInlineComment, getLineNumber } from "../ast";
import type { AnalysisStore } from "../core/analysis-store";
import type { TableInfo } from "../types";
import { parseColumnsFromObject, type ParseColumnOptions } from "./column.parser";
import { parseIndexesFromCallback } from "./index.parser";
import { parseTypeExports } from "./type-export.parser";

// ============================================================================
// 表解析选项
// ============================================================================

/**
 * 表解析选项
 */
export interface ParseTableOptions {
  /** 分析 Store（用于外键引用注册） */
  store?: AnalysisStore;
}

// ============================================================================
// 表定义解析
// ============================================================================

/**
 * 检查是否是 schema.table() 调用
 */
function isSchemaTableCall(
  callExpr: ts.CallExpression,
  sourceFile: ts.SourceFile
): boolean {
  // 格式: xxx.table(...)
  if (!ts.isPropertyAccessExpression(callExpr.expression)) {
    return false;
  }

  const propertyAccess = callExpr.expression;
  const methodName = propertyAccess.name.getText(sourceFile);

  return methodName === "table";
}

/**
 * 从 schema.table() 调用中提取 schema 名称
 */
function extractSchemaName(
  callExpr: ts.CallExpression,
  sourceFile: ts.SourceFile
): string {
  if (!ts.isPropertyAccessExpression(callExpr.expression)) {
    return "public";
  }

  // 尝试获取 schema 变量名
  const schemaExpr = callExpr.expression.expression;
  if (ts.isIdentifier(schemaExpr)) {
    // 这里只能获取变量名，实际 schema 名需要追踪变量定义
    // 默认返回 "app"（根据项目约定）
    return "app";
  }

  return "public";
}

/**
 * 解析表定义
 */
export function parseTableDefinition(
  variableDecl: ts.VariableDeclaration,
  sourceFile: ts.SourceFile,
  filePath: string,
  options?: ParseTableOptions
): TableInfo | undefined {
  // 变量名
  const variableName = variableDecl.name.getText(sourceFile);

  // 初始化表达式必须是调用表达式
  if (
    !variableDecl.initializer ||
    !ts.isCallExpression(variableDecl.initializer)
  ) {
    return undefined;
  }

  const callExpr = variableDecl.initializer;

  // 检查是否是 schema.table() 调用
  if (!isSchemaTableCall(callExpr, sourceFile)) {
    return undefined;
  }

  // 参数：(tableName, columns, indexes?)
  const args = callExpr.arguments;
  if (args.length < 2) return undefined;

  // 第一参数：表名（字符串字面量）
  const tableNameArg = args[0];
  if (!ts.isStringLiteral(tableNameArg)) return undefined;
  const tableName = tableNameArg.text;

  // 第二参数：字段定义对象
  const columnsArg = args[1];
  if (!ts.isObjectLiteralExpression(columnsArg)) return undefined;

  // 构建字段解析选项
  const columnParseOptions: ParseColumnOptions = {
    tableVariable: variableName,
    store: options?.store,
  };
  const columns = parseColumnsFromObject(columnsArg, sourceFile, columnParseOptions);

  // 第三参数（可选）：索引回调
  let indexes: TableInfo["indexes"] = [];
  if (args.length >= 3) {
    const indexArg = args[2];
    if (ts.isArrowFunction(indexArg) || ts.isFunctionExpression(indexArg)) {
      indexes = parseIndexesFromCallback(indexArg, sourceFile);
    }
  }

  // Schema 名称
  const schemaName = extractSchemaName(callExpr, sourceFile);

  // 文件级 JSDoc
  const fileJSDoc = getFileJSDoc(sourceFile);

  // 表级 JSDoc（变量声明上方的注释）
  const variableStatement = variableDecl.parent.parent;
  const tableJSDoc = ts.isVariableStatement(variableStatement)
    ? getInlineComment(variableStatement, sourceFile)
    : undefined;

  // 类型导出
  const exportedTypes = parseTypeExports(sourceFile);

  return {
    tableName,
    variableName,
    schemaName,
    fileName: path.basename(filePath),
    filePath,
    lineNumber: getLineNumber(variableDecl, sourceFile),
    fileJSDoc,
    tableJSDoc,
    columns,
    indexes,
    exportedTypes,
  };
}

/**
 * 从源文件解析所有表定义
 */
export function parseTablesFromSource(
  sourceFile: ts.SourceFile,
  filePath: string,
  options?: ParseTableOptions
): TableInfo[] {
  const tables: TableInfo[] = [];

  ts.forEachChild(sourceFile, (node) => {
    // 查找变量声明语句
    if (!ts.isVariableStatement(node)) return;

    // 检查是否有 export 修饰符
    const hasExport = node.modifiers?.some(
      (mod) => mod.kind === ts.SyntaxKind.ExportKeyword
    );
    if (!hasExport) return;

    // 遍历变量声明列表
    for (const decl of node.declarationList.declarations) {
      const tableInfo = parseTableDefinition(decl, sourceFile, filePath, options);
      if (tableInfo) {
        tables.push(tableInfo);
      }
    }
  });

  return tables;
}
