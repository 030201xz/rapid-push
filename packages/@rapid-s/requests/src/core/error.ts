import type { z } from "zod";

/**
 * 请求错误基类
 * 包含详细的错误信息,便于调试和处理
 */
export class RequestError extends Error {
  /** HTTP 状态码 (如果有) */
  readonly statusCode?: number;
  
  /** Zod 验证错误 (如果是验证失败) */
  readonly zodErrors?: z.ZodError;
  
  /** 原始错误对象 */
  readonly originalError?: unknown;
  
  /** 请求 URL */
  readonly url?: string;
  
  /** 请求方法 */
  readonly method?: string;
  
  /** 响应体 (如果有) */
  readonly responseBody?: unknown;

  constructor(
    message: string,
    options?: {
      statusCode?: number;
      zodErrors?: z.ZodError;
      originalError?: unknown;
      url?: string;
      method?: string;
      responseBody?: unknown;
    }
  ) {
    super(message);
    this.name = "RequestError";
    this.statusCode = options?.statusCode;
    this.zodErrors = options?.zodErrors;
    this.originalError = options?.originalError;
    this.url = options?.url;
    this.method = options?.method;
    this.responseBody = options?.responseBody;

    // 保持正确的原型链
    Object.setPrototypeOf(this, RequestError.prototype);
  }

  /**
   * 获取格式化的错误信息
   */
  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      message: this.message,
      statusCode: this.statusCode,
      url: this.url,
      method: this.method,
      zodErrors: this.zodErrors?.issues,
      responseBody: this.responseBody,
    };
  }
}

/**
 * 验证错误 - 当 Zod 验证失败时抛出
 */
export class ValidationError extends RequestError {
  constructor(
    zodError: z.ZodError,
    context: { url?: string; method?: string; type: "request" | "response" }
  ) {
    const errorMessages = zodError.issues.map((issue) => {
      const path = issue.path.join(".");
      return `${path}: ${issue.message}`;
    });

    const message = `${context.type === "request" ? "请求" : "响应"}验证失败:\n${errorMessages.join("\n")}`;

    super(message, {
      zodErrors: zodError,
      url: context.url,
      method: context.method,
    });

    this.name = "ValidationError";
    Object.setPrototypeOf(this, ValidationError.prototype);
  }
}

/**
 * HTTP 错误 - 当响应状态码不在 2xx 范围时抛出
 */
export class HttpError extends RequestError {
  constructor(
    statusCode: number,
    statusText: string,
    options: {
      url?: string;
      method?: string;
      responseBody?: unknown;
    }
  ) {
    const message = `HTTP ${statusCode}: ${statusText}`;
    super(message, {
      statusCode,
      url: options.url,
      method: options.method,
      responseBody: options.responseBody,
    });

    this.name = "HttpError";
    Object.setPrototypeOf(this, HttpError.prototype);
  }
}

/**
 * 网络错误 - 当网络请求失败时抛出
 */
export class NetworkError extends RequestError {
  constructor(originalError: unknown, url?: string, method?: string) {
    const message = `网络请求失败: ${originalError instanceof Error ? originalError.message : String(originalError)}`;
    super(message, {
      originalError,
      url,
      method,
    });

    this.name = "NetworkError";
    Object.setPrototypeOf(this, NetworkError.prototype);
  }
}

/**
 * 超时错误 - 当请求超时时抛出
 */
export class TimeoutError extends RequestError {
  constructor(timeout: number, url?: string, method?: string) {
    const message = `请求超时 (${timeout}ms)`;
    super(message, { url, method });

    this.name = "TimeoutError";
    Object.setPrototypeOf(this, TimeoutError.prototype);
  }
}

/**
 * 中止错误 - 当请求被中止时抛出
 */
export class AbortError extends RequestError {
  constructor(url?: string, method?: string) {
    const message = "请求已被中止";
    super(message, { url, method });

    this.name = "AbortError";
    Object.setPrototypeOf(this, AbortError.prototype);
  }
}
