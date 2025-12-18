/**
 * URL 构建工具
 * 负责处理路径参数、查询参数等 URL 相关操作
 */

/**
 * 将路径参数替换到 URL 中
 * 例如: /users/:id -> /users/123
 */
export function replacePathParams(
  url: string,
  params?: Record<string, string | number>
): string {
  if (!params) return url;

  let result = url;
  for (const [key, value] of Object.entries(params)) {
    result = result.replace(`:${key}`, String(value));
  }

  return result;
}

/**
 * 将对象转换为查询字符串
 */
export function buildQueryString(
  params?: Record<string, string | number | boolean | undefined>
): string {
  if (!params) return "";

  const entries: string[] = [];

  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) {
      entries.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`);
    }
  }

  const queryString = entries.join("&");
  return queryString ? `?${queryString}` : "";
}

/**
 * 构建完整的 URL
 */
export function buildUrl(
  baseURL: string | undefined,
  url: string,
  params?: Record<string, string | number>,
  query?: Record<string, string | number | boolean | undefined>
): string {
  // 替换路径参数
  let fullUrl = replacePathParams(url, params);

  // 处理 baseURL
  if (baseURL) {
    // 如果 url 是完整 URL (包含协议),则不使用 baseURL
    if (!/^[a-z][a-z\d+\-.]*:/i.test(fullUrl)) {
      const base = baseURL.endsWith("/") ? baseURL.slice(0, -1) : baseURL;
      const path = fullUrl.startsWith("/") ? fullUrl : `/${fullUrl}`;
      fullUrl = base + path;
    }
  }

  // 添加查询参数
  const queryString = buildQueryString(query);
  return fullUrl + queryString;
}
