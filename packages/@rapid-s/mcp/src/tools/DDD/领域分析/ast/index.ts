/**
 * AST 工具导出
 */

export { parseFile, parseCode, getJsDocDescription, getJsDocTag, getTypeText, resetProject, SyntaxKind } from "./ts-parser";

export {
  FILE_PATTERNS,
  DIRECTORY_PATTERNS,
  INHERITANCE_PATTERNS,
  DECORATOR_PATTERNS,
  matchByFileName,
  matchByDirectory,
  matchByInheritance,
  matchByDecorator,
  matchElementType,
  extractElementName,
  toPascalCase,
  toKebabCase,
  type PatternMatchResult,
} from "./pattern-matcher";

export {
  extractDecorators,
  extractPropertyFromClass,
  extractPropertyFromInterface,
  extractClassProperties,
  extractInterfaceProperties,
  extractParameter,
  extractParameters,
  extractMethodFromClass,
  extractMethodFromInterface,
  extractClassMethods,
  extractInterfaceMethods,
  getExtendsClass,
  getImplementsInterfaces,
  getExtendsInterfaces,
  getDecoratorNames,
  extractEnumMembers,
  extractUnionLiterals,
  extractConstructorDependencies,
} from "./type-extractor";
