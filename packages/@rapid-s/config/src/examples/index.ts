/**
 * @x/config 示例目录
 *
 * 本目录包含各种使用场景的示例代码
 */

// 基础用法 - 结构化配置入门
export { env as basicEnv } from "./basic-usage";

// 高级用法 - 复杂配置场景
export {
  apiConfig,
  buildConnectionUrl,
  cacheEnv,
  dbEnv,
  featureEnv,
} from "./advanced-usage";

// 类型推断演示 - 展示完整的类型安全特性
export { startServer, env as typeEnv } from "./type-inference";
