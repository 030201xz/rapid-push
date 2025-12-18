// 暂时忽略
// import { createClient } from "../src";
// import { cron } from "@x/cron";
// import { z } from "zod";

// /**
//  * 结合 @x/cron 使用的示例
//  */

// // API 响应 Schema
// const HealthCheckSchema = z.object({
//   status: z.enum(["healthy", "degraded", "unhealthy"]),
//   timestamp: z.string(),
//   services: z.record(z.boolean()),
// });

// const UserStatsSchema = z.object({
//   totalUsers: z.number(),
//   activeUsers: z.number(),
//   newUsersToday: z.number(),
// });

// // 创建 API 客户端
// const api = createClient({
//   baseURL: "https://api.example.com",
//   timeout: 5000,
//   retry: {
//     times: 2,
//     delay: 1000,
//   },
// });

// // 示例 1: 定期健康检查
// function example1() {
//   console.log("\n=== 示例 1: 定期健康检查 ===");

//   cron
//     .every(30)
//     .seconds()
//     .do(async () => {
//       try {
//         const health = await api.get("/health", {
//           responseSchema: HealthCheckSchema,
//         });
//         return health;
//       } catch (error) {
//         console.error("Health check failed:", error);
//         return { status: "unhealthy" as const, error };
//       }
//     })
//     .then((ctx) => {
//       if (ctx.status !== "healthy") {
//         console.warn(`⚠️ Service status: ${ctx.status}`);
//       } else {
//         console.log(`✓ Service is healthy`);
//       }
//     });
// }

// // 示例 2: 定期同步数据
// function example2() {
//   console.log("\n=== 示例 2: 定期同步用户统计 ===");

//   cron
//     .every(5)
//     .minutes()
//     .do(async () => {
//       // 第一步: 获取用户统计
//       const stats = await api.get("/stats/users", {
//         responseSchema: UserStatsSchema,
//       });

//       return { stats, timestamp: Date.now() };
//     })
//     .then(async (ctx) => {
//       // 第二步: 处理数据
//       console.log(`📊 User Stats at ${new Date(ctx.timestamp).toISOString()}`);
//       console.log(`  Total: ${ctx.stats.totalUsers}`);
//       console.log(`  Active: ${ctx.stats.activeUsers}`);
//       console.log(`  New today: ${ctx.stats.newUsersToday}`);

//       // 第三步: 如果有新用户,发送通知
//       if (ctx.stats.newUsersToday > 0) {
//         await api.post("/notifications", {
//           bodySchema: z.object({
//             type: z.string(),
//             message: z.string(),
//           }),
//           responseSchema: z.object({ sent: z.boolean() }),
//           body: {
//             type: "user_growth",
//             message: `${ctx.stats.newUsersToday} new users today!`,
//           },
//         });
//       }

//       return ctx;
//     });
// }

// // 示例 3: 带错误处理的定时任务
// function example3() {
//   console.log("\n=== 示例 3: 带错误恢复的定时任务 ===");

//   cron
//     .every(1)
//     .minute()
//     .do(async () => {
//       // 可能会失败的 API 调用
//       const data = await api.get("/unstable-endpoint", {
//         responseSchema: z.object({ value: z.number() }),
//         retry: { times: 3, delay: 500 },
//       });

//       return { data, success: true };
//     })
//     .then(
//       (ctx) => {
//         console.log("✓ Task completed:", ctx.data);
//       },
//       { continueOnError: true }
//     )
//     .then(() => {
//       // 即使上一步失败,也会执行这一步
//       console.log("Continuing after potential error...");
//     });
// }

// // 运行示例
// function main() {
//   console.log("Starting scheduled tasks with @x/cron and @x/requests...");

//   example1();
//   // example2(); // 注释掉避免实际 API 调用
//   // example3(); // 注释掉避免实际 API 调用

//   console.log("\nTasks scheduled. Press Ctrl+C to stop.");
// }

// main();
