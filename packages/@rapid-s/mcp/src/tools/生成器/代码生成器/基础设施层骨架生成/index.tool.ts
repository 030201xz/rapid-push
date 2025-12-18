// /**
//  * Repository Implementation Generator MCP 工具
//  *
//  * 基于领域层仓储接口生成基础设施层仓储实现骨架代码：
//  * - Mutation 文件：变更操作（save, delete, update 等）
//  * - Query 文件：查询操作（find, get, exists 等）
//  * - Mapper 文件：聚合根与持久化模型转换
//  * - Repository 实现：组合所有 Query/Mutation
//  *
//  * 生成的文件使用 .keep 后缀标识占位，完善后移除
//  */

// import "reflect-metadata";
// import { injectable } from "tsyringe";

// import { GeneratorError, generateRepositoryImplementation } from "./core";
// import {
//   inputSchema,
//   outputSchema,
//   type InputType,
//   type OutputType,
// } from "./types";
// import { Tool, BaseTool, ToolOptions, ToolContext, ToolResult } from "@/core";
// import { createLogger } from "@/shared";

// const log = createLogger("tool:repository-implementation-generator");

// // ============================================================================
// // MCP 工具定义
// // ============================================================================

// @injectable()
// @Tool()
// export class RepositoryImplementationGeneratorTool extends BaseTool<
//   typeof inputSchema,
//   typeof outputSchema,
//   InputType,
//   OutputType
// > {
//   override getOptions(): ToolOptions<typeof inputSchema, typeof outputSchema> {
//     return {
//       name: "repository_implementation_generator",
//       title: "Repository Implementation Generator (仓储实现生成器)",
//       description:
//         "Generate infrastructure layer repository implementation skeleton from domain repository interface. " +
//         "Scans repository interface methods and generates Mutation, Query, Mapper, and Repository files. " +
//         "Generated files use .keep suffix as placeholders - remove after implementation. " +
//         "(基于领域层仓储接口生成基础设施层仓储实现骨架。" +
//         "扫描仓储接口方法，生成 Mutation、Query、Mapper 和 Repository 文件。" +
//         "生成的文件使用 .keep 后缀作为占位标识，完善后移除。)",
//       inputSchema,
//       outputSchema,
//     };
//   }

//   override async onInit(): Promise<void> {
//     log.debug("Repository Implementation Generator Tool initializing...");
//   }

//   override async onReady(): Promise<void> {
//     log.debug("Repository Implementation Generator Tool ready");
//   }

//   override async execute(
//     input: InputType,
//     _context: ToolContext
//   ): Promise<ToolResult<OutputType>> {
//     const {
//       domainPath,
//       outputPath,
//       domainImportPath,
//       schemaPath,
//       aggregateName,
//       tableMapping,
//       options,
//     } = input;

//     try {
//       log.info(`生成仓储实现: ${domainPath} → ${outputPath}`);

//       // 调用核心生成器
//       const result = await generateRepositoryImplementation(
//         domainPath,
//         outputPath,
//         {
//           schemaPath,
//           aggregateName,
//           domainImportPath,
//           tableMapping,
//           options,
//         }
//       );

//       log.info(
//         `生成完成: ${result.summary.totalFiles} 个文件 ` +
//           `(${result.summary.mutations} Mutations, ${result.summary.queries} Queries)`
//       );

//       return {
//         success: true,
//         data: result,
//       };
//     } catch (error) {
//       // 处理已知错误类型
//       if (error instanceof GeneratorError) {
//         return {
//           success: false,
//           error: `[${error.code}] ${error.message}`,
//         };
//       }

//       // 未知错误
//       log.error("生成失败：", error);
//       return {
//         success: false,
//         error: error instanceof Error ? error.message : String(error),
//       };
//     }
//   }

//   override async onDestroy(): Promise<void> {
//     log.debug("Repository Implementation Generator Tool destroying...");
//   }
// }
