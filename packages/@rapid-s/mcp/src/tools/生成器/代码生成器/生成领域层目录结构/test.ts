// /**
//  * Domain Scaffold Generator - 测试脚本
//  *
//  * 使用示例 JSON 测试生成功能
//  */

// import { DomainScaffoldOrchestrator } from "./core";
// import { InputParser } from "./parser";
// import { PlaceholderRenderer } from "./renderer";
// import { FileWriter } from "./writer";
// import type { InputType } from "./types";

// // 测试输入数据（简化版）
// const testInput: InputType = {
//   outputPath: ".generated/ddd-scaffold-test",
//   structure: {
//     architecture: {
//       name: "DDD - Domain-Driven Design",
//       contexts: [
//         {
//           name: "wallet",
//           type: "bounded-context",
//           description: "钱包限界上下文",
//           subdomains: [
//             {
//               name: "wallet-account-management",
//               type: "core-domain",
//               description: "钱包账户和交易管理核心域",
//               layers: [
//                 {
//                   name: "domain",
//                   responsibilities: [
//                     "业务规则",
//                     "聚合根",
//                     "值对象",
//                     "领域事件",
//                     "领域异常",
//                   ],
//                   aggregates: [
//                     {
//                       name: "wallet-account",
//                       description: "钱包账户聚合根",
//                       root: "wallet-account.aggregate.ts",
//                       files: {
//                         entities: [
//                           {
//                             name: "wallet-account.entity.ts",
//                             description: "钱包账户实体",
//                           },
//                         ],
//                         "value-objects": [
//                           "account-number.vo.ts",
//                           "balance.vo.ts",
//                           "frozen-amount.vo.ts",
//                         ],
//                         states: [
//                           "active.state.ts",
//                           "frozen.state.ts",
//                           "account-state.interface.ts",
//                           "account-state.factory.ts",
//                         ],
//                         events: [
//                           "wallet-account.events.ts",
//                           "wallet-account.events.type-safety.ts",
//                         ],
//                       },
//                       repository: "wallet-account.repository.interface.ts",
//                     },
//                   ],
//                   services: [
//                     {
//                       name: "wallet-transaction.service.ts",
//                       description: "交易领域服务",
//                     },
//                   ],
//                   exceptions: {
//                     path: "exceptions",
//                     files: ["wallet.errors.ts", "transaction.errors.ts"],
//                   },
//                 },
//                 {
//                   name: "infrastructure",
//                   responsibilities: ["数据持久化"],
//                 },
//                 {
//                   name: "application",
//                   responsibilities: ["用例编排"],
//                 },
//                 {
//                   name: "presentation",
//                   responsibilities: ["API端点"],
//                 },
//               ],
//             },
//           ],
//         },
//       ],
//     },
//   },
//   options: {
//     placeholderSuffix: ".keep",
//     overwrite: false,
//   },
// };

// async function main() {
//   console.log("🚀 开始测试 Domain Scaffold Generator...\n");

//   // 组装依赖
//   const orchestrator = new DomainScaffoldOrchestrator(
//     new InputParser(),
//     new PlaceholderRenderer(),
//     new FileWriter()
//   );

//   try {
//     // 执行生成
//     const result = await orchestrator.execute(testInput);

//     console.log("✅ 生成成功！\n");
//     console.log("📊 统计信息：");
//     console.log(`   - 文件总数: ${result.stats.totalFiles}`);
//     console.log(`   - 目录总数: ${result.stats.totalDirs}`);
//     console.log(`   - 聚合数量: ${result.stats.aggregatesCount}`);
//     console.log(`   - 子域数量: ${result.stats.subdomainsCount}`);
//     console.log(`   - 跳过文件: ${result.stats.skippedFiles}`);

//     console.log("\n📁 目录结构预览：");
//     console.log(result.directoryTree);

//     console.log("\n📄 生成的文件分组：");
//     for (const group of result.generatedFiles) {
//       console.log(`\n   [${group.subdomain}/${group.layer}/${group.aggregate}]`);
//       for (const file of group.files) {
//         const status = file.created ? "✓" : "○";
//         console.log(`      ${status} ${file.path}`);
//       }
//     }
//   } catch (error) {
//     console.error("❌ 生成失败：", error);
//     process.exit(1);
//   }
// }

// main();
