// /**
//  * 领域分析器测试
//  *
//  * 使用示例路径进行分析测试
//  */

// import { analyzeDomainStructure } from "./core";

// // 测试路径
// const TEST_PATH =
//   "/home/xz/Projects/030201xy/wf/apps/backend/rapid-server/src/modules/context-user/identity-access";

// async function main() {
//   console.log("🔍 开始领域分析...\n");
//   console.log(`📁 分析路径: ${TEST_PATH}\n`);

//   try {
//     const startTime = Date.now();

//     const result = await analyzeDomainStructure(TEST_PATH, {
//       maxDepth: 10,
//       includeRelations: true,
//     });

//     const duration = Date.now() - startTime;

//     // 输出分析概要
//     console.log("📊 分析概要:");
//     console.log(`   - 入口路径: ${result.summary.entryPath}`);
//     console.log(`   - 分析耗时: ${result.summary.duration}ms`);
//     console.log(`   - 扫描文件: ${result.summary.stats.totalFiles}`);
//     console.log("");

//     // 输出统计信息
//     console.log("📈 统计信息:");
//     console.log(`   - 限界上下文: ${result.summary.stats.contexts}`);
//     console.log(`   - 聚合根: ${result.summary.stats.aggregates}`);
//     console.log(`   - 实体: ${result.summary.stats.entities}`);
//     console.log(`   - 值对象: ${result.summary.stats.valueObjects}`);
//     console.log(`   - 领域事件: ${result.summary.stats.events}`);
//     console.log(`   - 领域服务: ${result.summary.stats.services}`);
//     console.log(`   - 领域状态: ${result.summary.stats.states}`);
//     console.log(`   - 仓储接口: ${result.summary.stats.repositories}`);
//     console.log("");

//     // 输出限界上下文
//     console.log("🏛️ 限界上下文:");
//     for (const ctx of result.contexts) {
//       console.log(`   - ${ctx.name} (${ctx.id})`);
//       console.log(`     路径: ${ctx.path}`);
//       console.log(`     子域: ${ctx.subdomains.map((s) => s.name).join(", ")}`);
//     }
//     console.log("");

//     // 输出聚合根
//     console.log("🌳 聚合根:");
//     for (const agg of result.elements.aggregates) {
//       console.log(`   - ${agg.className} (${agg.id})`);
//       console.log(`     属性: ${agg.properties.length}, 方法: ${agg.methods.length}`);
//       console.log(`     值对象: ${agg.valueObjectIds.length}, 事件: ${agg.eventIds.length}`);
//     }
//     console.log("");

//     // 输出值对象
//     console.log("💎 值对象:");
//     for (const vo of result.elements.valueObjects) {
//       console.log(`   - ${vo.className} ${vo.isImmutable ? "(不可变)" : ""}`);
//       if (vo.validationRules.length > 0) {
//         console.log(`     验证规则: ${vo.validationRules.join(", ")}`);
//       }
//     }
//     console.log("");

//     // 输出领域事件
//     console.log("📨 领域事件:");
//     for (const event of result.elements.domainEvents) {
//       console.log(`   - ${event.className}`);
//       console.log(`     载荷字段: ${event.payload.map((p) => p.name).join(", ") || "无"}`);
//     }
//     console.log("");

//     // 输出仓储接口
//     console.log("📦 仓储接口:");
//     for (const repo of result.elements.repositories) {
//       console.log(`   - ${repo.interfaceName}`);
//       console.log(`     管理聚合: ${repo.aggregateType}`);
//       console.log(
//         `     方法: ${repo.methods.map((m) => `${m.name}(${m.operationType})`).join(", ")}`
//       );
//     }
//     console.log("");

//     // 输出关系
//     if (result.relations && result.relations.length > 0) {
//       console.log("🔗 关系图:");
//       for (const rel of result.relations.slice(0, 10)) {
//         console.log(`   ${rel.sourceId} --[${rel.type}]--> ${rel.targetId}`);
//       }
//       if (result.relations.length > 10) {
//         console.log(`   ... 共 ${result.relations.length} 条关系`);
//       }
//     }

//     console.log("\n✅ 分析完成！");
//     console.log(`实际耗时: ${duration}ms`);

//     // 输出完整 JSON（可选）
//     // console.log("\n📄 完整 JSON:");
//     // console.log(JSON.stringify(result, null, 2));

//   } catch (error) {
//     console.error("❌ 分析失败:", error);
//     process.exit(1);
//   }
// }

// main();
