import { createClient, loggerMiddleware, authMiddleware } from "../src";
import { z } from "zod";

/**
 * 高级功能示例
 */

const UserSchema = z.object({
  id: z.number(),
  name: z.string(),
  email: z.string().email(),
});

// 示例 1: 使用拦截器
async function example1() {
  console.log("\n=== 示例 1: 请求和响应拦截器 ===");

  const api = createClient({
    baseURL: "https://jsonplaceholder.typicode.com",
  });

  // 添加请求拦截器
  api.interceptRequest((config) => {
    console.log("→ Interceptor: Adding timestamp header");
    config.headers = {
      ...config.headers,
      "X-Request-Time": new Date().toISOString(),
    };
    return config;
  });

  // 添加响应拦截器
  api.interceptResponse({
    onFulfilled: (response) => {
      console.log("← Interceptor: Response received");
      return response;
    },
    onRejected: (error) => {
      console.error("✗ Interceptor: Request failed");
      throw error;
    },
  });

  const user = await api.get("/users/:id", {
    params: { id: 1 },
    responseSchema: UserSchema,
  });

  console.log("User:", user.name);
}

// 示例 2: 使用中间件
async function example2() {
  console.log("\n=== 示例 2: 中间件 ===");

  const api = createClient({
    baseURL: "https://jsonplaceholder.typicode.com",
  });

  // 添加日志中间件
  api.use(
    loggerMiddleware({
      debug: console.log,
      info: console.log,
      error: console.error,
    })
  );

  // 添加认证中间件
  api.use(authMiddleware(() => "fake-token-12345"));

  await api.get("/users/:id", {
    params: { id: 1 },
    responseSchema: UserSchema,
  });
}

// 示例 3: 自动重试
async function example3() {
  console.log("\n=== 示例 3: 自动重试 ===");

  const api = createClient({
    baseURL: "https://jsonplaceholder.typicode.com",
  });

  try {
    await api.get("/users/:id", {
      params: { id: 99999 },
      responseSchema: UserSchema,
      retry: {
        times: 3,
        delay: 1000,
        exponentialBackoff: true,
        onRetry: (error, attempt) => {
          console.log(`Retry attempt ${attempt}: ${error.message}`);
        },
      },
    });
  } catch (error) {
    console.error("Final error:", error);
  }
}

// 示例 4: 超时控制
async function example4() {
  console.log("\n=== 示例 4: 超时控制 ===");

  const api = createClient({
    baseURL: "https://jsonplaceholder.typicode.com",
  });

  try {
    await api.get("/users/:id", {
      params: { id: 1 },
      responseSchema: UserSchema,
      timeout: 100, // 设置一个很短的超时时间
    });
  } catch (error) {
    console.error("Timeout error:", error);
  }
}

// 示例 5: 手动取消请求
async function example5() {
  console.log("\n=== 示例 5: 取消请求 ===");

  const api = createClient({
    baseURL: "https://jsonplaceholder.typicode.com",
  });

  const controller = new AbortController();

  // 1 秒后取消请求
  setTimeout(() => {
    console.log("Aborting request...");
    controller.abort();
  }, 1000);

  try {
    await api.get("/users/:id", {
      params: { id: 1 },
      responseSchema: UserSchema,
      signal: controller.signal,
    });
  } catch (error) {
    console.error("Aborted:", error);
  }
}

// 示例 6: 使用 Bun 特性
async function example6() {
  console.log("\n=== 示例 6: Bun 特性 (verbose 模式) ===");

  const api = createClient({
    baseURL: "https://jsonplaceholder.typicode.com",
  });

  await api.get("/users/:id", {
    params: { id: 1 },
    responseSchema: UserSchema,
    bunOptions: {
      verbose: true, // 打印详细的请求/响应信息
    },
  });
}

// 运行所有示例
async function main() {
  await example1();
  await example2();
  await example3();
  // await example4(); // 注释掉避免超时错误
  // await example5(); // 注释掉避免取消错误
  await example6();
}

main();
