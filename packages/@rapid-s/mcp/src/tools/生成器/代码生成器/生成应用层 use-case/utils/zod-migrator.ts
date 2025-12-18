/**
 * Zod v3 → v4 API 迁移工具
 *
 * 自动将 Zod v3 的链式调用转换为 v4 的顶层方法
 */

/**
 * v3 弃用 API 到 v4 新 API 的映射规则
 * [匹配模式, 替换结果]
 */
const ZOD_V3_TO_V4_MIGRATIONS: ReadonlyArray<readonly [RegExp, string]> = [
  // 字符串验证类型提升为顶层
  [/z\.string\(\)\.uuid\(\)/g, "z.uuid()"],
  [/z\.string\(\)\.email\(\)/g, "z.email()"],
  [/z\.string\(\)\.url\(\)/g, "z.url()"],
  [/z\.string\(\)\.cuid\(\)/g, "z.cuid()"],
  [/z\.string\(\)\.cuid2\(\)/g, "z.cuid2()"],
  [/z\.string\(\)\.ulid\(\)/g, "z.ulid()"],
  [/z\.string\(\)\.nanoid\(\)/g, "z.nanoid()"],
  [/z\.string\(\)\.base64\(\)/g, "z.base64()"],
  [/z\.string\(\)\.base64url\(\)/g, "z.base64url()"],

  // 日期时间类型移至 z.iso 命名空间
  [/z\.string\(\)\.datetime\(\)/g, "z.iso.datetime()"],
  [/z\.string\(\)\.date\(\)/g, "z.iso.date()"],
  [/z\.string\(\)\.time\(\)/g, "z.iso.time()"],
  [/z\.string\(\)\.duration\(\)/g, "z.iso.duration()"],

  // 网络类型
  [/z\.string\(\)\.ip\(\)/g, "z.ipv4()"],
  [/z\.string\(\)\.cidr\(\)/g, "z.cidr()"],
] as const;

/**
 * 将 Zod v3 弃用的 API 转换为 v4 新 API
 *
 * @param zodType - 原始 Zod 类型表达式
 * @returns 迁移后的 Zod 类型表达式
 *
 * @example
 * migrateZodV3ToV4("z.string().email()") // → "z.email()"
 * migrateZodV3ToV4("z.uuid()") // → "z.uuid()"
 */
export function migrateZodV3ToV4(zodType: string): string {
  let result = zodType;

  for (const [pattern, replacement] of ZOD_V3_TO_V4_MIGRATIONS) {
    result = result.replace(pattern, replacement);
  }

  return result;
}

/**
 * 检查表达式是否包含已弃用的 v3 API
 */
export function hasDeprecatedV3Api(zodType: string): boolean {
  return ZOD_V3_TO_V4_MIGRATIONS.some(([pattern]) => pattern.test(zodType));
}
