/**
 * GraphQL Context 定义
 *
 * 每个 GraphQL 请求的上下文
 */

import type { DependencyContainer } from 'tsyringe';
import type { Logger } from '../logger';

/**
 * GraphQL 上下文接口
 *
 * 在 Resolver 中通过 context 参数访问
 * 简化架构：Resolver 直接从 container 获取 Service
 */
export interface GraphQLContext {
  /** 请求 ID */
  requestId: string;

  /** 日志器 */
  logger: Logger;

  /** DI 子容器（请求作用域） */
  container: DependencyContainer;

  /** 当前用户信息（可选，认证后填充） */
  user?: {
    id: string;
    roles: string[];
  };
}

/**
 * 创建请求 ID
 */
export function createRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}
