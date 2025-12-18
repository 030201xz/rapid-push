import { cron } from "../src";

/**
 * 快速测试示例 - 运行一次后自动退出
 */

let executionCount = 0;

// 每秒执行一次
cron
  .every(1)
  .seconds()
  .do(() => {
    executionCount++;
    console.log(`Execution ${executionCount}: Hello from CRON!`);
    return { count: executionCount };
  })
  .then((ctx) => {
    console.log(`Total executions: ${ctx.count}`);

    // 执行 3 次后停止
    if (ctx.count >= 3) {
      console.log("\nTest completed! Stopping...");
      cron.stop();
      cron.clear(); // 清除所有任务后程序会自动退出
    }
  });

console.log("Quick test started - will run 3 times and exit\n");
