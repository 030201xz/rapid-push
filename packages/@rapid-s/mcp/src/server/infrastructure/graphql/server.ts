/**
 * GraphQL 服务器配置
 *
 * 基于 graphql-yoga 的 GraphQL 服务器
 */

import {
  createSchema,
  createYoga,
  type YogaInitialContext,
  type YogaServerInstance,
} from 'graphql-yoga';
import { graphqlConfig } from '../../config';
import { createChildContainer } from '../../core/di';
import type { Resolvers } from '../../generated/graphql';
import { appLogger, createAppLogger } from '../logger';
import { createRequestId, type GraphQLContext } from './context';
import { scalars } from './scalars';

/** GraphQL 服务器配置选项 */
export interface GraphQLServerOptions {
  /** Schema 定义字符串 */
  typeDefs: string;
  /** Resolvers */
  resolvers: Record<string, unknown>;
}

/**
 * 完整的 GraphQL 上下文类型
 *
 * 包含 Yoga 初始上下文 + 自定义上下文
 */
export type FullGraphQLContext = YogaInitialContext & GraphQLContext;

/** GraphQL 服务器实例类型 */
export type GraphQLServer = YogaServerInstance<object, GraphQLContext>;

/**
 * 创建 GraphQL Yoga 实例
 *
 * @param options - 配置选项
 */
export function createGraphQLServer(
  options: GraphQLServerOptions,
): GraphQLServer {
  const logger = appLogger.child('GraphQL');

  // 创建 schema，使用完整上下文类型
  const schema = createSchema<FullGraphQLContext>({
    typeDefs: options.typeDefs,
    resolvers: {
      ...scalars,
      ...options.resolvers,
    },
  });

  const yoga = createYoga<object, GraphQLContext>({
    // 类型断言：schema 的 context 包含 YogaInitialContext & GraphQLContext
    // 而 createYoga 期望 object & YogaInitialContext & GraphQLContext
    // 两者在运行时是兼容的
    schema: schema as Parameters<
      typeof createYoga<object, GraphQLContext>
    >[0]['schema'],
    graphqlEndpoint: graphqlConfig.endpoint,

    // 启用/禁用 GraphiQL
    graphiql: graphqlConfig.enablePlayground,

    // 上下文工厂 - 返回自定义 GraphQL 上下文
    context: async (): Promise<GraphQLContext> => {
      const requestId = createRequestId();
      const requestLogger = createAppLogger(`Request:${requestId.slice(-6)}`);

      // 创建请求作用域的 DI 容器
      const container = createChildContainer();

      requestLogger.debug('GraphQL 请求开始', { requestId });

      return {
        requestId,
        logger: requestLogger,
        container,
      };
    },

    // 日志
    logging: {
      debug: message => logger.debug(String(message)),
      info: message => logger.info(String(message)),
      warn: message => logger.warn(String(message)),
      error: message => logger.error(String(message)),
    },
  });

  return yoga;
}

/** 应用版本号 */
const APP_VERSION = '0.1.0';

/**
 * 默认 Resolvers
 *
 * 使用 codegen 生成的类型确保类型安全
 */
export const baseResolvers: Resolvers = {
  Query: {
    _health: () => ({
      status: 'ok',
      timestamp: new Date(),
      version: APP_VERSION,
    }),
  },
  Mutation: {
    _noop: () => true,
  },
};
