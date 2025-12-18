import { z } from 'zod';

// ========== 环境变量 Schema ==========
// 应用启动时校验环境变量，类型安全 + 运行时校验
const envSchema = z.object({
  DATABASE_URL: z.url(),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3000),
});

export const env = envSchema.parse(process.env);

// 类型自动推导，无需手动定义
export type Env = z.infer<typeof envSchema>;
