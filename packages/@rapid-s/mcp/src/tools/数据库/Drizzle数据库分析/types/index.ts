/**
 * 类型导出入口
 */

// 领域模型
export type {
  AnalysisResult,
  AnalysisSummary,
  ColumnConstraints,
  ColumnInfo,
  ColumnOptions,
  ForeignKeyInfo,
  IndexInfo,
  TableInfo,
  TypeExportInfo,
  TypeExportKind,
} from './domain-models';

// 压缩模型
export { buildConstraintFlags, parseConstraintFlags } from './compact-models';
export type {
  CompactAnalysisResult,
  CompactColumnInfo,
  CompactSummary,
  CompactTableInfo,
  ConstraintFlag,
} from './compact-models';

// 输入
export {
  inputSchema,
  // [FULL_FORMAT_DISABLED] OutputFormat 已禁用
  // OutputFormat,
  type IncludeOptionsType,
  type InputType,
  // [FULL_FORMAT_DISABLED] OutputFormatType 已禁用
  // type OutputFormatType,
  type TableFilterType,
} from './input.schema';

// 输出
export {
  analysisSummarySchema,
  columnConstraintsSchema,
  columnInfoSchema,
  columnOptionsSchema,
  compactColumnInfoSchema,
  compactOutputSchema,
  compactSummarySchema,
  compactTableInfoSchema,
  foreignKeyInfoSchema,
  indexInfoSchema,
  outputSchema,
  tableInfoSchema,
  typeExportInfoSchema,
  unifiedOutputSchema,
  type CompactOutputType,
  type OutputType,
  type UnifiedOutputType,
} from './output.schema';
