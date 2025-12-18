import type { z } from "zod";

/**
 * 复用 Bun fetch 的类型定义
 * 直接使用 Bun 内置的 BunFetchRequestInit 类型
 * 
 * 包括以下属性:
 * - tls: TLS 配置
 * - verbose: 是否打印详细日志
 * - proxy: 代理服务器地址
 * - 以及所有标准的 RequestInit 属性
 */
export type BunFetchOptions = BunFetchRequestInit;



/**
 * 重试配置
 */
export interface RetryConfig {
  /** 重试次数 */
  times: number;
  /** 重试延迟(毫秒) */
  delay: number;
  /** 是否使用指数退避 */
  exponentialBackoff?: boolean;
  /** 重试回调 */
  onRetry?: (error: Error, attempt: number) => void | Promise<void>;
  /** 判断是否应该重试的函数 */
  shouldRetry?: (error: Error) => boolean;
}

/**
 * 拦截器函数类型
 */
export interface RequestInterceptor {
  (config: RequestConfig<z.ZodTypeAny>): RequestConfig<z.ZodTypeAny> | Promise<RequestConfig<z.ZodTypeAny>>;
}

export interface ResponseInterceptor {
  onFulfilled?: <T>(response: T) => T | Promise<T>;
  onRejected?: (error: unknown) => unknown;
}

/**
 * 中间件函数类型
 */
export type Middleware = (
  config: RequestConfig<z.ZodTypeAny>,
  next: (config: RequestConfig<z.ZodTypeAny>) => Promise<Response>
) => Promise<Response>;

/**
 * 请求配置类型
 * 使用泛型实现类型安全的请求和响应
 */
export interface RequestConfig<
  TResponseSchema extends z.ZodTypeAny,
  TBodySchema extends z.ZodTypeAny | undefined = undefined,
  TQuerySchema extends z.ZodTypeAny | undefined = undefined
> {
  /** 请求 URL */
  url?: string;
  
  /** HTTP 方法 */
  method?: "GET" | "POST" | "PUT" | "DELETE" | "PATCH" | "HEAD" | "OPTIONS";
  
  /** 响应的 Zod Schema (必需) */
  responseSchema: TResponseSchema;
  
  /** 请求体的 Zod Schema (可选) */
  bodySchema?: TBodySchema;
  
  /** 查询参数的 Zod Schema (可选) */
  querySchema?: TQuerySchema;
  
  /** 请求体数据 (类型从 bodySchema 推断) */
  body?: TBodySchema extends z.ZodTypeAny ? z.infer<TBodySchema> : never;
  
  /** 查询参数 (类型从 querySchema 推断) */
  query?: TQuerySchema extends z.ZodTypeAny 
    ? z.infer<TQuerySchema> 
    : Record<string, string | number | boolean | undefined>;
  
  /** 路径参数 (如 /users/:id 中的 id) */
  params?: Record<string, string | number>;
  
  /** 请求头 */
  headers?: Record<string, string>;
  
  /** 超时时间(毫秒) */
  timeout?: number;
  
  /** 重试配置 */
  retry?: RetryConfig;
  
  /** AbortSignal (用于取消请求) */
  signal?: AbortSignal;
  
  /** Bun 特定选项 (复用 Bun 的 fetch 类型) */
  bunOptions?: BunFetchOptions;
  
  /** 是否跳过响应验证 (默认 false) */
  skipValidation?: boolean;
}

/**
 * 客户端配置
 */
export interface ClientConfig {
  /** 基础 URL */
  baseURL?: string;
  
  /** 默认请求头 */
  headers?: Record<string, string>;
  
  /** 默认超时时间(毫秒) */
  timeout?: number;
  
  /** 默认重试配置 */
  retry?: RetryConfig;
  
  /** 默认 Bun 选项 */
  bunOptions?: BunFetchOptions;
  
  /** Logger 实例 (可选,支持 @x/logger) */
  logger?: {
    trace: (message: string, ...args: unknown[]) => void;
    debug: (message: string, ...args: unknown[]) => void;
    info: (message: string, ...args: unknown[]) => void;
    warn: (message: string, ...args: unknown[]) => void;
    error: (message: string, ...args: unknown[]) => void;
  };
}

/**
 * 响应类型 (自动从 Schema 推断)
 */
export type InferResponse<T extends z.ZodTypeAny> = z.infer<T>;

/**
 * 请求方法类型定义
 */
export interface RequestMethods {
  get<
    TResponseSchema extends z.ZodTypeAny,
    TQuerySchema extends z.ZodTypeAny | undefined = undefined
  >(
    url: string,
    config: Omit<RequestConfig<TResponseSchema, undefined, TQuerySchema>, "url" | "method" | "body" | "bodySchema">
  ): Promise<InferResponse<TResponseSchema>>;

  post<
    TResponseSchema extends z.ZodTypeAny,
    TBodySchema extends z.ZodTypeAny | undefined = undefined,
    TQuerySchema extends z.ZodTypeAny | undefined = undefined
  >(
    url: string,
    config: Omit<RequestConfig<TResponseSchema, TBodySchema, TQuerySchema>, "url" | "method">
  ): Promise<InferResponse<TResponseSchema>>;

  put<
    TResponseSchema extends z.ZodTypeAny,
    TBodySchema extends z.ZodTypeAny | undefined = undefined,
    TQuerySchema extends z.ZodTypeAny | undefined = undefined
  >(
    url: string,
    config: Omit<RequestConfig<TResponseSchema, TBodySchema, TQuerySchema>, "url" | "method">
  ): Promise<InferResponse<TResponseSchema>>;

  patch<
    TResponseSchema extends z.ZodTypeAny,
    TBodySchema extends z.ZodTypeAny | undefined = undefined,
    TQuerySchema extends z.ZodTypeAny | undefined = undefined
  >(
    url: string,
    config: Omit<RequestConfig<TResponseSchema, TBodySchema, TQuerySchema>, "url" | "method">
  ): Promise<InferResponse<TResponseSchema>>;

  delete<
    TResponseSchema extends z.ZodTypeAny,
    TQuerySchema extends z.ZodTypeAny | undefined = undefined
  >(
    url: string,
    config: Omit<RequestConfig<TResponseSchema, undefined, TQuerySchema>, "url" | "method" | "body" | "bodySchema">
  ): Promise<InferResponse<TResponseSchema>>;

  head(
    url: string,
    config?: Omit<RequestConfig<z.ZodVoid>, "url" | "method" | "body" | "bodySchema" | "responseSchema">
  ): Promise<void>;

  options(
    url: string,
    config?: Omit<RequestConfig<z.ZodVoid>, "url" | "method" | "body" | "bodySchema" | "responseSchema">
  ): Promise<void>;
}
