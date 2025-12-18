/**
 * AST 工具导出入口
 */

export {
  extractNumberLiteral,
  extractObjectProperty,
  extractStringLiteral,
  getFileJSDoc,
  getInlineComment,
  getJSDocComment,
  getLineNumber,
  mapDrizzleTypeToTS,
  parseChainCalls,
  type ChainCallInfo,
} from "./drizzle-ast-utils";
