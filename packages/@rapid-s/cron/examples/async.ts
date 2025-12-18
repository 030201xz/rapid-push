import { cron } from "../src";

/**
 * 异步任务示例
 */

// 模拟异步数据获取
async function fetchData(): Promise<{ users: string[] }> {
  await new Promise((resolve) => setTimeout(resolve, 100));
  return { users: ["Alice", "Bob", "Charlie"] };
}

// 模拟异步数据处理
async function processUsers(users: string[]): Promise<{ processed: number }> {
  await new Promise((resolve) => setTimeout(resolve, 50));
  return { processed: users.length };
}

// 每 10 秒执行
cron
  .every(10)
  .seconds()
  .do(async () => {
    console.log("Fetching data...");
    const data = await fetchData();
    return data;
  })
  .then(async (ctx) => {
    // ctx.users 有正确的类型推断 ✓
    console.log(`Processing ${ctx.users.length} users...`);
    const result = await processUsers(ctx.users);
    return result;
  })
  .then((ctx) => {
    // ctx.users 和 ctx.processed 都有类型 ✓
    console.log(
      `Completed! Processed ${ctx.processed} users:`,
      ctx.users.join(", ")
    );
  });

console.log("Async CRON scheduler started");
