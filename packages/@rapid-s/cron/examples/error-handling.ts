import { cron } from "../src";

/**
 * 错误处理示例
 */

// 每 15 秒执行
cron
  .every(15)
  .seconds()
  .do(() => {
    console.log("Task 1: Success");
    return { status: "ok" };
  })
  .then(
    () => {
      console.log("Task 2: This will fail");
      throw new Error("Simulated error");
      return { failed: true }; // 这行不会执行，但提供类型信息
    },
    { continueOnError: true }
  )
  .then((ctx) => {
    // 即使上一个任务失败,这个任务仍会执行
    console.log("Task 3: Still running, initial status:", ctx.status);
    return { recovered: true };
  });

console.log("Error handling example started");
