import { z } from "zod";
import { calculateRetryDelay, deepMerge, delay } from "../utils/helpers";
import { buildUrl } from "../utils/url-builder";
import { validate } from "../utils/validator";
import {
  AbortError,
  HttpError,
  NetworkError,
  RequestError,
  TimeoutError,
} from "./error";
import type {
  ClientConfig,
  InferResponse,
  Middleware,
  RequestConfig,
  RequestInterceptor,
  RequestMethods,
  ResponseInterceptor,
  RetryConfig,
} from "./types";

/// <reference types="bun-types" />

/**
 * HTTP 客户端类
 * 提供类型安全的 HTTP 请求功能
 */
export class HttpClient implements RequestMethods {
  private config: ClientConfig;
  private requestInterceptors: RequestInterceptor[] = [];
  private responseInterceptors: ResponseInterceptor[] = [];
  private middlewares: Middleware[] = [];

  constructor(config: ClientConfig = {}) {
    this.config = config;
  }

  /**
   * 配置客户端
   */
  configure(config: Partial<ClientConfig>): void {
    this.config = deepMerge(
      this.config as Record<string, unknown>,
      config as Record<string, unknown>
    ) as ClientConfig;
  }

  /**
   * 添加请求拦截器
   */
  interceptRequest(interceptor: RequestInterceptor): void {
    this.requestInterceptors.push(interceptor);
  }

  /**
   * 添加响应拦截器
   */
  interceptResponse(interceptor: ResponseInterceptor): void {
    this.responseInterceptors.push(interceptor);
  }

  /**
   * 添加中间件
   */
  use(middleware: Middleware): void {
    this.middlewares.push(middleware);
  }

  /**
   * GET 请求
   */
  async get<
    TResponseSchema extends z.ZodTypeAny,
    TQuerySchema extends z.ZodTypeAny | undefined = undefined,
  >(
    url: string,
    config: Omit<
      RequestConfig<TResponseSchema, undefined, TQuerySchema>,
      "url" | "method" | "body" | "bodySchema"
    >
  ): Promise<InferResponse<TResponseSchema>> {
    return this.request({
      ...config,
      url,
      method: "GET",
    } as RequestConfig<TResponseSchema, undefined, TQuerySchema>);
  }

  /**
   * POST 请求
   */
  async post<
    TResponseSchema extends z.ZodTypeAny,
    TBodySchema extends z.ZodTypeAny | undefined = undefined,
    TQuerySchema extends z.ZodTypeAny | undefined = undefined,
  >(
    url: string,
    config: Omit<
      RequestConfig<TResponseSchema, TBodySchema, TQuerySchema>,
      "url" | "method"
    >
  ): Promise<InferResponse<TResponseSchema>> {
    return this.request({
      ...config,
      url,
      method: "POST",
    } as RequestConfig<TResponseSchema, TBodySchema, TQuerySchema>);
  }

  /**
   * PUT 请求
   */
  async put<
    TResponseSchema extends z.ZodTypeAny,
    TBodySchema extends z.ZodTypeAny | undefined = undefined,
    TQuerySchema extends z.ZodTypeAny | undefined = undefined,
  >(
    url: string,
    config: Omit<
      RequestConfig<TResponseSchema, TBodySchema, TQuerySchema>,
      "url" | "method"
    >
  ): Promise<InferResponse<TResponseSchema>> {
    return this.request({
      ...config,
      url,
      method: "PUT",
    } as RequestConfig<TResponseSchema, TBodySchema, TQuerySchema>);
  }

  /**
   * PATCH 请求
   */
  async patch<
    TResponseSchema extends z.ZodTypeAny,
    TBodySchema extends z.ZodTypeAny | undefined = undefined,
    TQuerySchema extends z.ZodTypeAny | undefined = undefined,
  >(
    url: string,
    config: Omit<
      RequestConfig<TResponseSchema, TBodySchema, TQuerySchema>,
      "url" | "method"
    >
  ): Promise<InferResponse<TResponseSchema>> {
    return this.request({
      ...config,
      url,
      method: "PATCH",
    } as RequestConfig<TResponseSchema, TBodySchema, TQuerySchema>);
  }

  /**
   * DELETE 请求
   */
  async delete<
    TResponseSchema extends z.ZodTypeAny,
    TQuerySchema extends z.ZodTypeAny | undefined = undefined,
  >(
    url: string,
    config: Omit<
      RequestConfig<TResponseSchema, undefined, TQuerySchema>,
      "url" | "method" | "body" | "bodySchema"
    >
  ): Promise<InferResponse<TResponseSchema>> {
    return this.request({
      ...config,
      url,
      method: "DELETE",
    } as RequestConfig<TResponseSchema, undefined, TQuerySchema>);
  }

  /**
   * HEAD 请求
   */
  async head(
    url: string,
    config?: Omit<
      RequestConfig<z.ZodVoid>,
      "url" | "method" | "body" | "bodySchema" | "responseSchema"
    >
  ): Promise<void> {
    await this.request({
      ...(config || {}),
      url,
      method: "HEAD",
      responseSchema: z.void(),
      skipValidation: true,
    });
  }

  /**
   * OPTIONS 请求
   */
  async options(
    url: string,
    config?: Omit<
      RequestConfig<z.ZodVoid>,
      "url" | "method" | "body" | "bodySchema" | "responseSchema"
    >
  ): Promise<void> {
    await this.request({
      ...(config || {}),
      url,
      method: "OPTIONS",
      responseSchema: z.void(),
      skipValidation: true,
    });
  }

  /**
   * 通用请求方法
   */
  private async request<
    TResponseSchema extends z.ZodTypeAny,
    TBodySchema extends z.ZodTypeAny | undefined = undefined,
    TQuerySchema extends z.ZodTypeAny | undefined = undefined,
  >(
    config: RequestConfig<TResponseSchema, TBodySchema, TQuerySchema>
  ): Promise<InferResponse<TResponseSchema>> {
    // 合并配置
    const mergedConfig = this.mergeRequestConfig(config);

    // 应用请求拦截器
    let finalConfig = mergedConfig as RequestConfig<z.ZodTypeAny>;
    for (const interceptor of this.requestInterceptors) {
      finalConfig = await interceptor(finalConfig);
    }

    try {
      // 执行请求 (通过中间件链)
      const response = await this.executeWithMiddlewares(finalConfig);

      // 解析响应
      const data = await this.parseResponse(response, finalConfig);

      // 应用响应拦截器
      let finalData: unknown = data;
      for (const interceptor of this.responseInterceptors) {
        if (interceptor.onFulfilled) {
          finalData = await interceptor.onFulfilled(finalData);
        }
      }

      return finalData as InferResponse<TResponseSchema>;
    } catch (error) {
      // 应用响应拦截器 (错误处理)
      let finalError = error;
      for (const interceptor of this.responseInterceptors) {
        if (interceptor.onRejected) {
          finalError = await interceptor.onRejected(finalError);
        }
      }

      throw finalError;
    }
  }

  /**
   * 通过中间件链执行请求
   */
  private async executeWithMiddlewares(
    config: RequestConfig<z.ZodTypeAny>
  ): Promise<Response> {
    let index = 0;

    const next = async (
      cfg: RequestConfig<z.ZodTypeAny>
    ): Promise<Response> => {
      if (index < this.middlewares.length) {
        const middleware = this.middlewares[index++];
        if (!middleware) {
          throw new RequestError("Middleware is undefined");
        }
        return middleware(cfg, next);
      }
      return this.executeRequest(cfg);
    };

    return next(config);
  }

  /**
   * 执行实际的 fetch 请求 (支持重试和超时)
   */
  private async executeRequest(
    config: RequestConfig<z.ZodTypeAny>
  ): Promise<Response> {
    const { url, method = "GET", retry } = config;

    if (!url) {
      throw new RequestError("URL is required");
    }

    // 构建完整 URL
    const fullUrl = buildUrl(
      this.config.baseURL,
      url,
      config.params,
      config.query
    );

    // 日志记录
    this.log("debug", `${method} ${fullUrl}`);

    // 准备请求体
    const body = await this.prepareRequestBody(config);

    // 准备请求头
    const headers = this.prepareHeaders(config, body);

    // 合并 Bun 选项
    const bunOptions = { ...this.config.bunOptions, ...config.bunOptions };

    // 重试逻辑
    const retryConfig = retry || this.config.retry;
    let lastError: Error | undefined;

    const maxAttempts = retryConfig ? retryConfig.times + 1 : 1;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        // 创建 AbortController (用于超时)
        const controller = new AbortController();
        const timeoutId = this.setupTimeout(config, controller);

        const fetchOptions: RequestInit = {
          method,
          headers,
          body,
          signal: config.signal || controller.signal,
          ...bunOptions,
        };

        const response = await fetch(fullUrl, fetchOptions);

        // 清除超时
        if (timeoutId !== null) {
          clearTimeout(timeoutId);
        }

        this.log("debug", `${method} ${fullUrl} - ${response.status}`);

        // 检查 HTTP 状态
        if (!response.ok) {
          // 克隆响应以避免 "Body already used" 错误
          const clonedResponse = response.clone() as Response;
          const responseBody = await this.safeParseResponseBody(clonedResponse);

          this.log(
            "error",
            `HTTP ${response.status} ${response.statusText}:`,
            responseBody
          );

          throw new HttpError(response.status, response.statusText, {
            url: fullUrl,
            method,
            responseBody,
          });
        }

        return response;
      } catch (error) {
        lastError = this.normalizeError(error, fullUrl, method);

        // 判断是否应该重试
        if (attempt < maxAttempts && this.shouldRetry(lastError, retryConfig)) {
          const delayMs = calculateRetryDelay(
            attempt,
            retryConfig?.delay || 1000,
            retryConfig?.exponentialBackoff || false
          );

          this.log(
            "warn",
            `Retry ${attempt}/${retryConfig?.times || 0} after ${delayMs}ms: ${lastError.message}`
          );

          if (retryConfig?.onRetry) {
            await retryConfig.onRetry(lastError, attempt);
          }

          await delay(delayMs);
        } else {
          throw lastError;
        }
      }
    }

    throw lastError || new RequestError("Request failed");
  }

  /**
   * 解析响应
   */
  private async parseResponse<TResponseSchema extends z.ZodTypeAny>(
    response: Response,
    config: RequestConfig<TResponseSchema>
  ): Promise<InferResponse<TResponseSchema>> {
    const { responseSchema, skipValidation } = config;

    // 如果跳过验证,直接返回
    if (skipValidation) {
      return undefined as InferResponse<TResponseSchema>;
    }

    // 解析 JSON
    const contentType = response.headers.get("content-type") || "";

    let data: unknown;
    let responseText: string;
    try {
      responseText = await response.text();
      this.log(
        "debug",
        `响应内容 (${contentType}):`,
        responseText.substring(0, 500)
      );

      data = JSON.parse(responseText);
    } catch (error) {
      this.log("error", "解析 JSON 失败:", error);
      throw new RequestError(
        `Failed to parse response as JSON: ${error instanceof Error ? error.message : String(error)}`
      );
    }

    // Zod 验证
    try {
      const validated = await validate(responseSchema, data, {
        url: config.url,
        method: config.method,
        type: "response",
      });

      this.log("debug", "响应数据验证成功");
      return validated;
    } catch (error) {
      // 验证失败时,打印完整的原始响应数据
      this.log("error", "❌ 响应数据验证失败!");
      this.log("error", "原始响应内容:", responseText);
      this.log("error", "解析后的数据:", data);
      this.log("error", "验证错误:", error);
      throw error;
    }
  }

  /**
   * 准备请求体
   */
  private async prepareRequestBody(
    config: RequestConfig<z.ZodTypeAny>
  ): Promise<Bun.BodyInit | undefined> {
    const { body, bodySchema } = config;

    if (!body) return undefined;

    // 如果有 bodySchema,先验证
    if (bodySchema) {
      const validated = await validate(bodySchema, body, {
        url: config.url,
        method: config.method,
        type: "request",
      });

      return JSON.stringify(validated);
    }

    return JSON.stringify(body);
  }

  /**
   * 准备请求头
   */
  private prepareHeaders(
    config: RequestConfig<z.ZodTypeAny>,
    body: Bun.BodyInit | undefined
  ): Bun.HeadersInit {
    const headers: Record<string, string> = {
      ...this.config.headers,
      ...config.headers,
    };

    // 如果有请求体且未设置 Content-Type,自动添加
    if (body && !headers["Content-Type"] && !headers["content-type"]) {
      headers["Content-Type"] = "application/json";
    }

    return headers;
  }

  /**
   * 设置超时
   */
  private setupTimeout(
    config: RequestConfig<z.ZodTypeAny>,
    controller: AbortController
  ): number | null {
    const timeout = config.timeout || this.config.timeout;

    if (!timeout) return null;

    const timeoutId = globalThis.setTimeout(() => {
      controller.abort();
    }, timeout) as unknown as number;

    return timeoutId;
  }

  /**
   * 判断是否应该重试
   */
  private shouldRetry(error: Error, retryConfig?: RetryConfig): boolean {
    if (!retryConfig) return false;

    // 自定义判断函数
    if (retryConfig.shouldRetry) {
      return retryConfig.shouldRetry(error);
    }

    // 默认: 网络错误和超时错误可以重试, HTTP 5xx 也可以重试
    if (error instanceof NetworkError || error instanceof TimeoutError) {
      return true;
    }

    if (error instanceof HttpError) {
      return error.statusCode ? error.statusCode >= 500 : false;
    }

    return false;
  }

  /**
   * 规范化错误
   */
  private normalizeError(error: unknown, url: string, method: string): Error {
    if (error instanceof RequestError) {
      return error;
    }

    if (error instanceof Error) {
      if (error.name === "AbortError") {
        return new AbortError(url, method);
      }
      return new NetworkError(error, url, method);
    }

    return new NetworkError(error, url, method);
  }

  /**
   * 安全解析响应体 (用于错误处理)
   */
  private async safeParseResponseBody(response: Response): Promise<unknown> {
    try {
      // 克隆响应以避免消费 body
      const text = await response.text();
      try {
        return JSON.parse(text);
      } catch {
        return text;
      }
    } catch {
      return null;
    }
  }

  /**
   * 合并请求配置
   */
  private mergeRequestConfig<
    T extends z.ZodTypeAny,
    B extends z.ZodTypeAny | undefined = undefined,
    Q extends z.ZodTypeAny | undefined = undefined,
  >(config: RequestConfig<T, B, Q>): RequestConfig<T, B, Q> {
    return {
      ...config,
      headers: {
        ...this.config.headers,
        ...config.headers,
      },
      timeout: config.timeout || this.config.timeout,
      retry: config.retry || this.config.retry,
      bunOptions: {
        ...this.config.bunOptions,
        ...config.bunOptions,
      },
    };
  }

  /**
   * 日志记录
   */
  private log(
    level: "trace" | "debug" | "info" | "warn" | "error",
    message: string,
    ...args: unknown[]
  ): void {
    if (this.config.logger) {
      this.config.logger[level](message, ...args);
    }
  }
}

/**
 * 创建 HTTP 客户端
 */
export function createClient(config: ClientConfig = {}): HttpClient {
  return new HttpClient(config);
}
