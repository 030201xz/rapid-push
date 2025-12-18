// /**
//  * Domain Scaffold Generator MCP 工具
//  *
//  * 根据 DDD 结构化输入生成 Domain 层目录结构及占位文件
//  *
//  * 功能特性：
//  * - 解析 DDD 结构定义 JSON
//  * - 生成聚合、实体、值对象、状态、事件等占位文件
//  * - 生成 Repository 接口、领域服务、异常等占位文件
//  * - 文件使用 .keep 后缀标识占位
//  * - 生成带有 JSDoc 和骨架代码的内容
//  */

// import 'reflect-metadata';
// import { injectable } from 'tsyringe';
// import { createLogger } from "@/shared";

// import { DomainScaffoldOrchestrator } from './core';
// import { InputParser } from './parser';
// import { PlaceholderRenderer } from './renderer';
// import {
//   inputSchema,
//   outputSchema,
//   type InputType,
//   type OutputType,
// } from './types';
// import { FileWriter } from './writer';
// import { Tool, BaseTool, ToolOptions, ToolContext, ToolResult } from '@/core';

// const log = createLogger('tool:domain-scaffold-generator');

// // ============================================================================
// // MCP 工具定义
// // ============================================================================

// @injectable()
// @Tool()
// export class DomainScaffoldGeneratorTool extends BaseTool<
//   typeof inputSchema,
//   typeof outputSchema,
//   InputType,
//   OutputType
// > {
//   private orchestrator!: DomainScaffoldOrchestrator;

//   // 工具配置
//   override getOptions(): ToolOptions<typeof inputSchema, typeof outputSchema> {
//     return {
//       name: 'ddd_domain_scaffold_generator',
//       title: 'Domain Scaffold Generator (领域层脚手架生成器)',
//       description:
//         'Generate DDD Domain layer directory structure and placeholder files from structured JSON input. ' +
//         'Creates aggregates, entities, value objects, states, events, repositories, services, and exceptions. ' +
//         'Files are generated with .keep suffix to indicate placeholders. ' +
//         'Each file contains JSDoc comments and skeleton code. ' +
//         '(根据 DDD 结构化 JSON 输入生成领域层目录结构和占位文件。' +
//         '创建聚合、实体、值对象、状态、事件、仓储、服务和异常。' +
//         '文件使用 .keep 后缀标识占位。每个文件包含 JSDoc 注释和骨架代码。)',
//       inputSchema,
//       outputSchema,
//     };
//   }

//   // 初始化钩子
//   override async onInit(): Promise<void> {
//     log.debug('Domain Scaffold Generator 初始化中...');

//     // 组装依赖
//     this.orchestrator = new DomainScaffoldOrchestrator(
//       new InputParser(),
//       new PlaceholderRenderer(),
//       new FileWriter(),
//     );
//   }

//   // 就绪钩子
//   override async onReady(): Promise<void> {
//     log.debug('Domain Scaffold Generator 就绪');
//   }

//   // 核心执行逻辑
//   override async execute(
//     input: InputType,
//     _context: ToolContext,
//   ): Promise<ToolResult<OutputType>> {
//     try {
//       const result = await this.orchestrator.execute(input);

//       return {
//         success: true,
//         data: result,
//       };
//     } catch (error) {
//       log.error('生成失败：', error);
//       return {
//         success: false,
//         error: error instanceof Error ? error.message : String(error),
//       };
//     }
//   }

//   // 销毁钩子
//   override async onDestroy(): Promise<void> {
//     log.debug('Domain Scaffold Generator 销毁中...');
//   }
// }
