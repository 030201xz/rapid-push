import type { Middleware } from "../core/types";

/**
 * 日志中间件
 * 记录请求和响应信息
 */
export function loggerMiddleware(
  logger?: {
    debug: (message: string, ...args: unknown[]) => void;
    info: (message: string, ...args: unknown[]) => void;
    error: (message: string, ...args: unknown[]) => void;
  }
): Middleware {
  return async (config, next) => {
    const startTime = Date.now();
    const { method = "GET", url } = config;

    logger?.info(`→ ${method} ${url}`);

    try {
      const response = await next(config);
      const duration = Date.now() - startTime;

      logger?.info(`← ${method} ${url} - ${response.status} (${duration}ms)`);

      return response;
    } catch (error) {
      const duration = Date.now() - startTime;

      logger?.error(`✗ ${method} ${url} - Failed (${duration}ms)`, error);

      throw error;
    }
  };
}

/**
 * 性能计时中间件
 */
export function timingMiddleware(
  onTiming?: (url: string, method: string, duration: number) => void
): Middleware {
  return async (config, next) => {
    const startTime = Date.now();

    try {
      const response = await next(config);
      const duration = Date.now() - startTime;

      onTiming?.(config.url || "", config.method || "GET", duration);

      return response;
    } catch (error) {
      const duration = Date.now() - startTime;
      onTiming?.(config.url || "", config.method || "GET", duration);
      throw error;
    }
  };
}

/**
 * 认证中间件
 * 自动添加认证 token
 */
export function authMiddleware(
  getToken: () => string | Promise<string>
): Middleware {
  return async (config, next) => {
    const token = await getToken();

    config.headers = {
      ...config.headers,
      Authorization: `Bearer ${token}`,
    };

    return next(config);
  };
}
