import { cron } from "../src";

/**
 * 基础示例：优雅的链式任务调度
 */

// ========================================
// 方式 1: 自然语言风格（推荐）
// ========================================

// 每 5 秒执行一次
cron
  .every(5)
  .seconds()
  .do(() => {
    console.log("Task 1: Started");
    console.log("我是任务1");
    return { step1: "completed", timestamp: Date.now() };
  })
  .then((ctx) => {
    // ctx.step1 有类型推断 ✓
    console.log(`Task 2: Previous step was ${ctx.step1}`);
    return { step2: "done", count: 42 };
  })
  .then((ctx) => {
    // ctx.step1, ctx.step2, ctx.timestamp, ctx.count 都有正确的类型 ✓
    console.log(`Task 3: Final context`, ctx);
    return { final: true };
  });

// // 每分钟执行
// cron
//   .every(1)
//   .minute()
//   .do(() => {
//     console.log("Every minute task");
//     return { minute: new Date().getMinutes() };
//   })
//   .then((ctx) => {
//     console.log(`Current minute: ${ctx.minute}`);
//   });

// // ========================================
// // 方式 2: CRON 表达式（灵活控制）
// // ========================================

// // 使用原始 cron 表达式
// cron
//   .every("*/10 * * * * *")
//   .do(() => {
//     console.log("Every 10 seconds (cron expression)");
//     return { customTime: Date.now() };
//   })
//   .then((ctx) => {
//     console.log(`Custom cron executed at: ${ctx.customTime}`);
//   });

// // ========================================
// // 方式 3: 任务控制（暂停/恢复/停止）
// // ========================================

// const job = cron
//   .every(3)
//   .seconds()
//   .do(() => {
//     console.log("Controllable task running...");
//   });

// // 5秒后暂停任务
// setTimeout(() => {
//   console.log("⏸️  Pausing job...");
//   job.pause();
// }, 5000);

// // 10秒后恢复任务
// setTimeout(() => {
//   console.log("▶️  Resuming job...");
//   job.resume();
// }, 10000);

// // 15秒后停止任务
// setTimeout(() => {
//   console.log("⏹️  Stopping job...");
//   job.stop();
// }, 15000);

// // ========================================
// // 查看所有任务
// // ========================================

// console.log("✅ CRON scheduler started");
// console.log("📋 Active jobs:", cron.list());

// // 调度器会自动保持程序运行,无需额外代码
