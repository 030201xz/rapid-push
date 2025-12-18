/**
 * 类型导出解析器
 * 解析 Drizzle Schema 中的类型导出定义
 */
import ts from "typescript";

import { getLineNumber } from "../ast";
import type { TypeExportInfo, TypeExportKind } from "../types";

// ============================================================================
// 类型导出解析
// ============================================================================

/**
 * 解析类型导出语句
 * 格式: export type User = typeof users.$inferSelect;
 */
export function parseTypeExports(
  sourceFile: ts.SourceFile
): TypeExportInfo[] {
  const exports: TypeExportInfo[] = [];

  ts.forEachChild(sourceFile, (node) => {
    // 查找类型别名声明
    if (!ts.isTypeAliasDeclaration(node)) return;

    // 检查是否有 export 修饰符
    const hasExport = node.modifiers?.some(
      (mod) => mod.kind === ts.SyntaxKind.ExportKeyword
    );
    if (!hasExport) return;

    const typeName = node.name.getText(sourceFile);
    const typeNode = node.type;

    // 检查是否为 typeof xxx.$inferSelect 或 typeof xxx.$inferInsert
    if (!ts.isTypeQueryNode(typeNode)) return;

    const exprName = typeNode.exprName;
    if (!ts.isQualifiedName(exprName)) return;

    const rightName = exprName.right.getText(sourceFile);

    let kind: TypeExportKind | undefined;
    if (rightName === "$inferSelect") {
      kind = "select";
    } else if (rightName === "$inferInsert") {
      kind = "insert";
    }

    if (kind) {
      exports.push({
        typeName,
        kind,
        lineNumber: getLineNumber(node, sourceFile),
      });
    }
  });

  return exports;
}
