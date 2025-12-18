// /**
//  * Repository Implementation Generator 测试
//  */
// import { generateRepositoryImplementation } from "./core";

// // ============================================================================
// // 测试用例
// // ============================================================================

// /**
//  * 测试生成器
//  *
//  * 使用示例：
//  * bun run ./src/tools/生成器/代码生成器/基础设施层骨架生成/test.ts
//  */
// async function main() {
//   console.log("🧪 Repository Implementation Generator Test\n");

//   // 测试路径（使用项目中实际存在的领域目录）
//   const domainPath =
//     "/home/xz/Projects/030201xy/wf/apps/backend/rapid-server/src/modules/context-user/identity-access/user-management";

//   // 临时输出目录
//   const outputPath = "_generated/";

//   // 自定义领域导入路径（模拟实际项目结构）
//   const domainImportPath = "../../../domain/aggregates/user";

//   try {
//     console.log(`📂 领域目录: ${domainPath}`);
//     console.log(`📂 输出目录: ${outputPath}`);
//     console.log(`📂 领域导入路径: ${domainImportPath}`);
//     console.log("");

//     const result = await generateRepositoryImplementation(
//       domainPath,
//       outputPath,
//       {
//         domainImportPath,
//         options: {
//           dryRun: false, // 实际写入文件
//           suffix: ".keep",
//           overwrite: true, // 覆盖已存在文件
//         },
//       }
//     );

//     console.log(`✅ 聚合名称: ${result.aggregateName}`);
//     console.log("");

//     console.log("📄 生成的文件列表:");
//     for (const file of result.generatedFiles) {
//       const icon =
//         file.type === "mutation"
//           ? "🔸"
//           : file.type === "query"
//             ? "🔹"
//             : file.type === "mapper"
//               ? "🔷"
//               : file.type === "repository"
//                 ? "🔶"
//                 : "📁";
//       console.log(`   ${icon} [${file.status}] ${file.filePath}`);
//     }

//     console.log("");
//     console.log("📊 统计摘要:");
//     console.log(`   Mutations: ${result.summary.mutations}`);
//     console.log(`   Queries: ${result.summary.queries}`);
//     console.log(`   Total Files: ${result.summary.totalFiles}`);
//     console.log(`   Skipped: ${result.summary.skipped}`);
//   } catch (error) {
//     console.error("❌ 测试失败:", error);
//     process.exit(1);
//   }
// }

// main();
