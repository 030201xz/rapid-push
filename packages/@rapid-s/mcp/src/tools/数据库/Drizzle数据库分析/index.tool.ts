/**
 * Drizzle Schema Analyzer MCP 工具
 *
 * 使用 TypeScript AST 分析 Drizzle ORM Schema 文件，提取结构化的数据库文档：
 * - 表定义：表名、变量名、Schema 名
 * - 字段信息：字段名、类型、约束、JSDoc 注释
 * - 索引定义：索引名、字段、唯一性
 * - 类型导出：$inferSelect, $inferInsert 类型
 *
 * 当前仅支持 compact 格式输出（节省约 80% Token）
 * TODO: [FULL_FORMAT_DISABLED] 查看 types/ 目录下的注释以启用 full 格式
 */

import "reflect-metadata";
import { injectable } from "tsyringe";

import { AnalysisError, analyzeDrizzleSchema, toCompactFormat } from "./core";
import {
  inputSchema,
  unifiedOutputSchema,
  type CompactOutputType,
  type InputType,
  type TableFilterType,
  type UnifiedOutputType,
} from "./types";
import { createLogger } from "@/shared";
import { Tool, BaseTool, ToolOptions, ToolContext, ToolResult } from "@/core";

// [FULL_FORMAT_DISABLED] 启用 full 格式时取消注释以下导入
// import { outputSchema, type OutputType } from "./types";

const log = createLogger("tool:drizzle-schema-analyzer");

// ============================================================================
// 表过滤辅助函数
// ============================================================================

// [FULL_FORMAT_DISABLED] 启用 full 格式时取消注释以下函数
// /**
//  * 根据过滤器筛选 Full 格式表
//  */
// function filterFullTables<T extends { tableName: string; fileName: string }>(
//   tables: T[],
//   filter?: TableFilterType
// ): T[] {
//   if (!filter) return tables;
//
//   return tables.filter((table) => {
//     // 按表名精确匹配
//     if (filter.tables && filter.tables.length > 0) {
//       if (!filter.tables.includes(table.tableName)) {
//         return false;
//       }
//     }
//
//     // 按 glob 模式匹配
//     if (filter.pattern) {
//       const regex = new RegExp(
//         `^${filter.pattern.replace(/\*/g, ".*").replace(/\?/g, ".")}$`
//       );
//       if (!regex.test(table.tableName)) {
//         return false;
//       }
//     }
//
//     // 按目录匹配
//     if (filter.dir) {
//       // 检查文件路径是否包含指定目录
//       if (!table.fileName.includes(filter.dir)) {
//         return false;
//       }
//     }
//
//     return true;
//   });
// }

/**
 * 根据过滤器筛选 Compact 格式表
 */
function filterCompactTables<T extends { table: string; file: string }>(
  tables: T[],
  filter?: TableFilterType
): T[] {
  if (!filter) return tables;

  return tables.filter((tbl) => {
    // 按表名精确匹配
    if (filter.tables && filter.tables.length > 0) {
      if (!filter.tables.includes(tbl.table)) {
        return false;
      }
    }

    // 按 glob 模式匹配
    if (filter.pattern) {
      const regex = new RegExp(
        `^${filter.pattern.replace(/\*/g, ".*").replace(/\?/g, ".")}$`
      );
      if (!regex.test(tbl.table)) {
        return false;
      }
    }

    // 按目录匹配
    if (filter.dir) {
      // 检查文件路径是否包含指定目录
      if (!tbl.file.includes(filter.dir)) {
        return false;
      }
    }

    return true;
  });
}

// ============================================================================
// MCP 工具定义
// ============================================================================

@injectable()
@Tool()
export class DrizzleSchemaAnalyzerTool extends BaseTool<
  typeof inputSchema,
  typeof unifiedOutputSchema,
  InputType,
  UnifiedOutputType
> {
  override getOptions(): ToolOptions<
    typeof inputSchema,
    typeof unifiedOutputSchema
  > {
    return {
      name: "drizzle_schema_analyzer",
      title: "Drizzle Schema Analyzer (Drizzle 数据库 Schema 分析器)",
      description:
        "Analyze Drizzle ORM schema files using TypeScript AST. " +
        "Extracts table definitions, column information (with JSDoc comments), indexes, and exported types. " +
        "Supports two output formats: 'full' for complete details, 'compact' for token-optimized output (default, saves ~80% tokens). " +
        "Supports table filtering by name, pattern, or directory. " +
        "(使用 TypeScript AST 分析 Drizzle ORM Schema 文件。" +
        "提取表定义、字段信息（含 JSDoc 注释）、索引定义和导出的类型。" +
        "支持两种输出格式：full=完整输出，compact=压缩输出（默认，节省~80% Token）。" +
        "支持按表名、模式或目录过滤。)",
      inputSchema,
      // [FULL_FORMAT_DISABLED] 当前仅使用 compact 格式的 schema
      outputSchema: unifiedOutputSchema,
    };
  }

  override async onInit(): Promise<void> {
    log.debug("Drizzle Schema Analyzer Tool initializing...");
  }

  override async onReady(): Promise<void> {
    log.debug("Drizzle Schema Analyzer Tool ready");
  }

  override async execute(
    input: InputType,
    _context: ToolContext
  ): Promise<ToolResult<UnifiedOutputType>> {
    // [FULL_FORMAT_DISABLED] format 参数已禁用，当前固定使用 compact 格式
    // 启用 full 格式时恢复：const { schemaPath, format = "compact", filter, include } = input;
    const { schemaPath, filter, include } = input;

    try {
      // 调用核心分析器获取完整结果
      const fullResult = await analyzeDrizzleSchema(schemaPath);

      // [FULL_FORMAT_DISABLED] full 格式暂时禁用，取消注释以启用
      // if (format === "full") {
      //   // Full 格式：完整输出（可选过滤）
      //   const filteredTables = filterFullTables(fullResult.tables, filter);
      //
      //   const result: OutputType = {
      //     schemaPath: fullResult.schemaPath,
      //     tables: filteredTables,
      //     summary: {
      //       ...fullResult.summary,
      //       totalTables: filteredTables.length,
      //       totalColumns: filteredTables.reduce(
      //         (acc: number, t) => acc + t.columns.length,
      //         0
      //       ),
      //       totalIndexes: filteredTables.reduce(
      //         (acc: number, t) => acc + t.indexes.length,
      //         0
      //       ),
      //     },
      //   };
      //
      //   return {
      //     success: true,
      //     data: result,
      //   };
      // }

      // Compact 格式：压缩输出（当前唯一支持的格式）
      const compactResult = toCompactFormat(fullResult, include);

      // 应用过滤器
      const filteredTables = filterCompactTables(compactResult.tables, filter);

      const result: CompactOutputType = {
        path: compactResult.path,
        sum: {
          ...compactResult.sum,
          tables: filteredTables.length,
          cols: filteredTables.reduce((acc: number, t) => acc + t.cols.length, 0),
          idx: filteredTables.reduce((acc: number, t) => acc + (t.idx?.length ?? 0), 0),
        },
        tables: filteredTables,
      };

      return {
        success: true,
        data: result,
      };
    } catch (error) {
      // 处理已知错误类型
      if (error instanceof AnalysisError) {
        return {
          success: false,
          error: `[${error.code}] ${error.message}`,
        };
      }

      // 未知错误
      log.error("分析失败：", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  override async onDestroy(): Promise<void> {
    log.debug("Drizzle Schema Analyzer Tool destroying...");
  }
}
