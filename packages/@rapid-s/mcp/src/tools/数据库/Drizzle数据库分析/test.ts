// /**
//  * Drizzle Schema Analyzer 测试文件
//  *
//  * 运行: bun run .skills-mcp/tools/database/drizzle-schema-analyzer/test.ts
//  */
// import { analyzeDrizzleSchema, toCompactFormat } from "./core";

// // ============================================================================
// // 测试用例
// // ============================================================================

// async function testBasicAnalysis() {
//   console.log("🔍 测试 1: 基础表分析\n");

//   const testPath =
//     "/home/xz/Projects/030201xy/wf/apps/backend/rapid-server/src/infrastructure/database/schema/user/01-core";

//   const result = await analyzeDrizzleSchema(testPath);

//   console.log("📊 分析摘要:");
//   console.log(`   - 表总数: ${result.summary.totalTables}`);
//   console.log(`   - 字段总数: ${result.summary.totalColumns}`);
//   console.log(`   - 索引总数: ${result.summary.totalIndexes}`);
//   console.log(`   - 分析文件数: ${result.summary.filesAnalyzed}\n`);

//   // 输出第一个表的详情
//   const firstTable = result.tables[0];
//   if (firstTable) {
//     console.log(`📋 示例表: ${firstTable.tableName}`);
//     console.log(`   字段数: ${firstTable.columns.length}`);
//     console.log(`   索引数: ${firstTable.indexes.length}`);
//   }

//   console.log("\n✅ 测试 1 完成！\n");
// }

// async function testForeignKeyAnalysis() {
//   console.log("🔍 测试 2: 外键解析\n");

//   // 使用包含外键的测试 Schema
//   const testPath =
//     "/home/xz/Projects/030201xy/wf/.skills-mcp/tools/数据库/Drizzle数据库分析/__test__";

//   const result = await analyzeDrizzleSchema(testPath);

//   console.log("📊 分析摘要:");
//   console.log(`   - 表总数: ${result.summary.totalTables}`);
//   console.log(`   - 字段总数: ${result.summary.totalColumns}`);
//   console.log(`   - 索引总数: ${result.summary.totalIndexes}\n`);

//   // 输出表详情（特别关注外键）
//   for (const table of result.tables) {
//     console.log(`\n📋 表: ${table.tableName} (${table.variableName})`);
//     console.log(`   文件: ${table.fileName}`);

//     console.log(`\n   字段 (${table.columns.length}):`);
//     for (const col of table.columns) {
//       const constraints: string[] = [];
//       if (col.constraints.isPrimaryKey) constraints.push("PK");
//       if (col.constraints.isNotNull) constraints.push("NOT NULL");
//       if (col.constraints.isUnique) constraints.push("UNIQUE");
//       if (col.constraints.hasDefault) constraints.push("DEFAULT");

//       // 外键信息
//       let fkInfo = "";
//       if (col.constraints.references) {
//         const ref = col.constraints.references;
//         fkInfo = ` -> FK(${ref.referencedTable}.${ref.referencedColumn}`;
//         if (ref.onDelete) fkInfo += `, onDelete: ${ref.onDelete}`;
//         if (ref.onUpdate) fkInfo += `, onUpdate: ${ref.onUpdate}`;
//         fkInfo += ")";
//       }

//       const constraintStr =
//         constraints.length > 0 ? ` [${constraints.join(", ")}]` : "";
//       const jsDocStr = col.jsDoc ? ` -- ${col.jsDoc}` : "";

//       console.log(
//         `     - ${col.columnName}: ${col.dataType} -> ${col.tsType}${constraintStr}${fkInfo}${jsDocStr}`
//       );
//     }

//     if (table.indexes.length > 0) {
//       console.log(`\n   索引 (${table.indexes.length}):`);
//       for (const idx of table.indexes) {
//         console.log(
//           `     - ${idx.indexName ?? "(unnamed)"}: [${idx.columns.join(", ")}]`
//         );
//       }
//     }
//   }

//   console.log("\n✅ 测试 2 完成！\n");
// }

// async function testCompactFormat() {
//   console.log("🔍 测试 3: Compact 压缩格式对比\n");

//   // 使用较大的目录进行对比测试
//   const testPath =
//     "/home/xz/Projects/030201xy/wf/apps/backend/rapid-server/src/infrastructure/database/schema/user";

//   const fullResult = await analyzeDrizzleSchema(testPath);
//   const compactResult = toCompactFormat(fullResult);

//   // 计算 JSON 大小
//   const fullJson = JSON.stringify(fullResult);
//   const compactJson = JSON.stringify(compactResult);

//   const fullSize = fullJson.length;
//   const compactSize = compactJson.length;
//   const savedPercent = ((1 - compactSize / fullSize) * 100).toFixed(1);

//   console.log("📊 输出大小对比:");
//   console.log(`   - Full 格式: ${fullSize.toLocaleString()} 字符`);
//   console.log(`   - Compact 格式: ${compactSize.toLocaleString()} 字符`);
//   console.log(`   - 节省: ${savedPercent}%\n`);

//   console.log("📋 Compact 格式摘要:");
//   console.log(`   - 表总数 (tables): ${compactResult.sum.tables}`);
//   console.log(`   - 字段总数 (cols): ${compactResult.sum.cols}`);
//   console.log(`   - 索引总数 (idx): ${compactResult.sum.idx}`);
//   console.log(`   - 文件数 (files): ${compactResult.sum.files}\n`);

//   // 显示一个压缩表的示例
//   const sampleTable = compactResult.tables[0];
//   if (sampleTable) {
//     console.log(`📋 示例压缩表: ${sampleTable.table}`);
//     console.log(`   变量: ${sampleTable.var}`);
//     console.log(`   文件: ${sampleTable.file}`);
//     console.log(`   描述: ${sampleTable.doc ?? "(无)"}`);
//     console.log(`   字段数: ${sampleTable.cols.length}`);

//     // 显示前 3 个字段
//     console.log("\n   前 3 个字段:");
//     for (const col of sampleTable.cols.slice(0, 3)) {
//       console.log(`     - col: "${col.col}", info: "${col.info}"`);
//       if (col.doc) console.log(`       doc: "${col.doc}"`);
//       if (col.fk) console.log(`       fk: "${col.fk}"`);
//     }

//     // 显示索引
//     if (sampleTable.idx && sampleTable.idx.length > 0) {
//       console.log(`\n   索引 (前 3 个):`);
//       for (const idx of sampleTable.idx.slice(0, 3)) {
//         console.log(`     - ${idx}`);
//       }
//     }
//   }

//   console.log("\n✅ 测试 3 完成！\n");
// }

// async function main() {
//   console.log("═══════════════════════════════════════════════════════════");
//   console.log("          Drizzle Schema Analyzer 测试套件");
//   console.log("═══════════════════════════════════════════════════════════\n");

//   try {
//     await testBasicAnalysis();
//     await testForeignKeyAnalysis();
//     await testCompactFormat();

//     console.log("═══════════════════════════════════════════════════════════");
//     console.log("                    所有测试通过！ ✅");
//     console.log("═══════════════════════════════════════════════════════════");
//   } catch (error) {
//     console.error("❌ 测试失败:", error);
//     process.exit(1);
//   }
// }

// main();
