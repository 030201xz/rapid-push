
/**
 * 类型安全检查示例
 * 验证 bunOptions 类型是否正确
 */

import { createClient, type BunFetchOptions, type ClientConfig } from "../src/index";
import { z } from "zod";

// ✅ 类型安全的 BunFetchOptions
const bunOptions: BunFetchOptions = {
  // 标准 RequestInit 属性
  headers: {
    "User-Agent": "test",
  },
  
  // Bun 特定属性
  verbose: true,
  // proxy: 1111,
  // s3: 123,
  // TLS 配置
  tls: {
    rejectUnauthorized: false,
  },
};

// ✅ 类型安全的 ClientConfig
const config: ClientConfig = {
  baseURL: "https://api.example.com",
  headers: {
    "Content-Type": "application/json",
  },
  
  // bunOptions 应该有完整的类型提示
  bunOptions: {
    verbose: true,
    proxy: "http://proxy.example.com:8080",
    tls: {
      rejectUnauthorized: false,
      ca: "...",
    },
  },
};

// ✅ 创建客户端时的类型检查
const client = createClient({
  baseURL: "https://api.example.com",
  bunOptions: {
    verbose: true,
    // TypeScript 会提示所有可用的属性
    proxy: "http://proxy.example.com:8080",
    tls: {
      rejectUnauthorized: false,
    },
  },
});

// ✅ 请求时的类型检查
const UserSchema = z.object({
  id: z.number(),
  name: z.string(),
});

async function testRequest() {
  const user = await client.get("users/1", {
    responseSchema: UserSchema,
    // bunOptions 在请求级别也有完整类型
    bunOptions: {
      verbose: true,
      proxy: "http://proxy.example.com:8080",
      unix: "/var/run/docker.sock", // Unix socket 支持
      decompress: false, // 控制自动解压
    },
  });

  console.log(user.name); // ✅ TypeScript 知道 user.name 是 string
}

// ❌ 类型错误示例(取消注释会报错)
/*
const invalidConfig: ClientConfig = {
  baseURL: "https://api.example.com",
  bunOptions: {
    invalidProperty: true, // ❌ Error: 'invalidProperty' does not exist in type 'BunFetchOptions'
  },
};
*/

console.log("✅ 类型检查通过!");
console.log("BunFetchOptions 类型:", typeof bunOptions);
console.log("ClientConfig 类型:", typeof config);
