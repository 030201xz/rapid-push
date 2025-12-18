/**
 * 字段解析器
 * 解析 Drizzle Schema 中的字段定义
 */
import ts from "typescript";

import {
  extractNumberLiteral,
  extractObjectProperty,
  extractStringLiteral,
  getInlineComment,
  getLineNumber,
  mapDrizzleTypeToTS,
  parseChainCalls,
} from "../ast";
import type { AnalysisStore, PendingReference } from "../core/analysis-store";
import type { ColumnConstraints, ColumnInfo, ColumnOptions, ForeignKeyInfo } from "../types";

// ============================================================================
// 约束方法集合
// ============================================================================

/** 主键方法 */
const PRIMARY_KEY_METHODS = new Set(["primaryKey"]);

/** 非空方法 */
const NOT_NULL_METHODS = new Set(["notNull"]);

/** 唯一方法 */
const UNIQUE_METHODS = new Set(["unique"]);

/** 默认值方法 */
const DEFAULT_METHODS = new Set(["default", "defaultRandom", "defaultNow", "$default", "$defaultFn"]);

/** 外键方法 */
const REFERENCES_METHODS = new Set(["references"]);

// ============================================================================
// 字段解析
// ============================================================================

/**
 * 解析外键引用表达式
 * 格式: .references(() => users.id, { onDelete: 'cascade' })
 */
function parseReferencesCall(
  call: ReturnType<typeof parseChainCalls>[number],
  sourceFile: ts.SourceFile
): { tableVariable: string; columnName: string; onDelete?: string; onUpdate?: string } | undefined {
  if (!call.arguments || call.arguments.length === 0) return undefined;

  const firstArg = call.arguments[0];

  // 第一个参数是箭头函数: () => users.id
  if (!ts.isArrowFunction(firstArg)) return undefined;

  const body = firstArg.body;

  // 箭头函数体是属性访问表达式: users.id
  if (!ts.isPropertyAccessExpression(body)) return undefined;

  const tableVariable = body.expression.getText(sourceFile);
  const columnName = body.name.getText(sourceFile);

  // 解析第二个参数（选项对象）
  let onDelete: string | undefined;
  let onUpdate: string | undefined;

  if (call.arguments.length >= 2) {
    const optionsArg = call.arguments[1];
    if (ts.isObjectLiteralExpression(optionsArg)) {
      for (const prop of optionsArg.properties) {
        if (!ts.isPropertyAssignment(prop) || !ts.isIdentifier(prop.name)) continue;

        const propName = prop.name.text;
        if (propName === "onDelete" && ts.isStringLiteral(prop.initializer)) {
          onDelete = prop.initializer.text;
        }
        if (propName === "onUpdate" && ts.isStringLiteral(prop.initializer)) {
          onUpdate = prop.initializer.text;
        }
      }
    }
  }

  return { tableVariable, columnName, onDelete, onUpdate };
}

/**
 * 解析字段约束
 */
function parseColumnConstraints(
  chainCalls: ReturnType<typeof parseChainCalls>,
  sourceFile: ts.SourceFile,
  options?: {
    /** 当前表变量名 */
    tableVariable?: string;
    /** 当前字段名 */
    columnName?: string;
    /** 分析 Store（用于注册外键引用） */
    store?: AnalysisStore;
  }
): ColumnConstraints {
  const constraints: ColumnConstraints = {
    isPrimaryKey: false,
    isNotNull: false,
    isUnique: false,
    hasDefault: false,
  };

  for (const call of chainCalls) {
    const methodName = call.methodName;

    if (PRIMARY_KEY_METHODS.has(methodName)) {
      constraints.isPrimaryKey = true;
      // 主键默认非空
      constraints.isNotNull = true;
    }

    if (NOT_NULL_METHODS.has(methodName)) {
      constraints.isNotNull = true;
    }

    if (UNIQUE_METHODS.has(methodName)) {
      constraints.isUnique = true;
    }

    if (DEFAULT_METHODS.has(methodName)) {
      constraints.hasDefault = true;
      // 提取默认值表达式
      if (call.arguments && call.arguments.length > 0) {
        const firstArg = call.arguments[0];
        constraints.defaultExpression = firstArg.getText(sourceFile);
      } else if (methodName === "defaultRandom") {
        constraints.defaultExpression = "defaultRandom()";
      } else if (methodName === "defaultNow") {
        constraints.defaultExpression = "defaultNow()";
      }
    }

    // 处理外键引用
    if (REFERENCES_METHODS.has(methodName)) {
      const refInfo = parseReferencesCall(call, sourceFile);
      if (refInfo) {
        // 如果提供了 store，注册为待解析引用
        if (options?.store && options.tableVariable && options.columnName) {
          const pendingRef: PendingReference = {
            tableVariable: options.tableVariable,
            columnName: options.columnName,
            referencedTableVariable: refInfo.tableVariable,
            referencedColumnName: refInfo.columnName,
            onDelete: refInfo.onDelete,
            onUpdate: refInfo.onUpdate,
          };
          options.store.addPendingReference(pendingRef);
        } else {
          // 直接填充引用信息（变量名形式）
          constraints.references = {
            referencedTable: refInfo.tableVariable,
            referencedColumn: refInfo.columnName,
            onDelete: refInfo.onDelete,
            onUpdate: refInfo.onUpdate,
          };
        }
      }
    }
  }

  return constraints;
}

/**
 * 解析字段选项
 */
function parseColumnOptions(
  chainCalls: ReturnType<typeof parseChainCalls>,
  sourceFile: ts.SourceFile
): ColumnOptions | undefined {
  // 第一个调用通常是类型定义，如 varchar('name', { length: 50 })
  const firstCall = chainCalls[0];
  if (!firstCall || !firstCall.arguments) return undefined;

  const options: ColumnOptions = {};
  let hasOptions = false;

  // 尝试从第二个参数提取选项对象
  const lengthExpr = extractObjectProperty(
    firstCall.arguments,
    1,
    "length",
    sourceFile
  );
  if (lengthExpr) {
    const length = extractNumberLiteral(lengthExpr);
    if (length !== undefined) {
      options.length = length;
      hasOptions = true;
    }
  }

  const precisionExpr = extractObjectProperty(
    firstCall.arguments,
    1,
    "precision",
    sourceFile
  );
  if (precisionExpr) {
    const precision = extractNumberLiteral(precisionExpr);
    if (precision !== undefined) {
      options.precision = precision;
      hasOptions = true;
    }
  }

  const scaleExpr = extractObjectProperty(
    firstCall.arguments,
    1,
    "scale",
    sourceFile
  );
  if (scaleExpr) {
    const scale = extractNumberLiteral(scaleExpr);
    if (scale !== undefined) {
      options.scale = scale;
      hasOptions = true;
    }
  }

  // 枚举值提取 (对于 pgEnum 或类似类型)
  // TODO: 完善枚举解析

  return hasOptions ? options : undefined;
}

/**
 * 字段解析选项
 */
export interface ParseColumnOptions {
  /** 当前表变量名（用于外键引用注册） */
  tableVariable?: string;
  /** 分析 Store（用于外键引用注册） */
  store?: AnalysisStore;
}

/**
 * 解析单个字段定义
 */
export function parseColumnDefinition(
  property: ts.PropertyAssignment,
  sourceFile: ts.SourceFile,
  options?: ParseColumnOptions
): ColumnInfo | undefined {
  // 属性名（代码中的属性名）
  const propertyName = property.name.getText(sourceFile);

  // 字段值必须是调用表达式
  if (!ts.isCallExpression(property.initializer)) {
    return undefined;
  }

  // 解析链式调用
  const chainCalls = parseChainCalls(property.initializer, sourceFile);
  if (chainCalls.length === 0) {
    return undefined;
  }

  // 第一个调用是类型定义
  const typeCall = chainCalls[0];
  const dataType = typeCall.methodName;

  // 数据库字段名（第一个字符串参数）
  const columnName =
    extractStringLiteral(typeCall.arguments, 0, sourceFile) ?? propertyName;

  // TypeScript 类型映射
  const tsType = mapDrizzleTypeToTS(dataType);

  // 行号
  const lineNumber = getLineNumber(property, sourceFile);

  // JSDoc 注释
  const jsDoc = getInlineComment(property, sourceFile);

  // 约束（传递 store 用于外键引用注册）
  const constraints = parseColumnConstraints(chainCalls, sourceFile, {
    tableVariable: options?.tableVariable,
    columnName: propertyName,
    store: options?.store,
  });

  // 选项
  const columnOptions = parseColumnOptions(chainCalls, sourceFile);

  return {
    columnName,
    propertyName,
    dataType,
    tsType,
    lineNumber,
    jsDoc,
    constraints,
    columnOptions,
  };
}

/**
 * 解析对象字面量中的所有字段定义
 */
export function parseColumnsFromObject(
  objectLiteral: ts.ObjectLiteralExpression,
  sourceFile: ts.SourceFile,
  options?: ParseColumnOptions
): ColumnInfo[] {
  const columns: ColumnInfo[] = [];

  for (const property of objectLiteral.properties) {
    if (!ts.isPropertyAssignment(property)) continue;

    const columnInfo = parseColumnDefinition(property, sourceFile, options);
    if (columnInfo) {
      columns.push(columnInfo);
    }
  }

  return columns;
}
