/**
 * Expo SFV (Structured Field Values) 工具
 *
 * 实现 Expo SFV 0 规范的字典序列化
 * 用于生成 expo-manifest-filters 和 expo-server-defined-headers
 *
 * 规范: https://docs.expo.dev/technical-specs/expo-sfv-0/
 * 基于 RFC 8941 的子集
 */

/**
 * 将字符串值字典转换为 SFV 字典格式
 *
 * @example
 * ```ts
 * toSfvDictionary({ branch: "main", env: "production" })
 * // => 'branch="main", env="production"'
 * ```
 */
export function toSfvDictionary(
  dict: Record<string, string>
): string {
  const entries = Object.entries(dict);

  if (entries.length === 0) {
    return '';
  }

  return entries
    .map(([key, value]) => {
      // 验证键格式（字母数字和 - _ .）
      if (!/^[a-zA-Z0-9_.-]+$/.test(key)) {
        throw new Error(`Invalid SFV key: ${key}`);
      }

      // 转义字符串值中的特殊字符
      const escapedValue = value
        .replace(/\\/g, '\\\\') // 反斜杠
        .replace(/"/g, '\\"'); // 双引号

      return `${key}="${escapedValue}"`;
    })
    .join(', ');
}

/**
 * 从 SFV 字典字符串解析为对象
 *
 * @example
 * ```ts
 * fromSfvDictionary('branch="main", env="production"')
 * // => { branch: "main", env: "production" }
 * ```
 */
export function fromSfvDictionary(
  sfv: string
): Record<string, string> {
  if (!sfv.trim()) {
    return {};
  }

  const result: Record<string, string> = {};
  const regex = /([a-zA-Z0-9_.-]+)="([^"]*)"/g;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(sfv)) !== null) {
    const [, key, value] = match;
    if (!key || value === undefined) continue;
    // 反转义
    result[key] = value.replace(/\\"/g, '"').replace(/\\\\/g, '\\');
  }

  return result;
}

/**
 * 根据更新元数据生成 manifest filters
 *
 * 过滤逻辑：
 * - 如果过滤器中提到了某个字段，元数据中对应的字段必须缺失或相等
 * - 通常用于分支、环境、发布渠道等维度的过滤
 *
 * @param metadata - 更新的元数据
 * @param filterKeys - 需要作为过滤器的键（如果为空，返回空过滤器）
 */
export function generateManifestFilters(
  metadata: Record<string, string>,
  filterKeys?: string[]
): string {
  // 如果未指定过滤键，使用所有元数据键
  const keys = filterKeys ?? Object.keys(metadata);

  if (keys.length === 0) {
    return '';
  }

  // 仅包含指定键的元数据
  const filteredMetadata: Record<string, string> = {};
  for (const key of keys) {
    if (metadata[key] !== undefined) {
      filteredMetadata[key] = metadata[key];
    }
  }

  return toSfvDictionary(filteredMetadata);
}
