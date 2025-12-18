/**
 * 用户 GraphQL Resolver
 *
 * 使用 codegen 生成的类型，确保类型安全
 */

import { TOKENS } from '../../core/di/tokens';
import type {
  User as GQLUser,
  UserList as GQLUserList,
  MutationResolvers,
  QueryResolvers,
  Resolvers,
} from '../../generated/graphql';
import type { GraphQLContext } from '../../infrastructure/graphql';
import type { User } from './user.entity';
import {
  createUserInputSchema,
  updateUserInputSchema,
  validateInput,
} from './user.schema';
import type { UserService } from './user.service';

/**
 * 将领域用户转换为 GraphQL 类型
 *
 * 领域模型 → GraphQL 模型的映射
 */
function toGQLUser(user: User): GQLUser {
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    status: user.status.toUpperCase() as GQLUser['status'],
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

/**
 * 从上下文获取 UserService
 */
function getUserService(context: GraphQLContext): UserService {
  return context.container.resolve<UserService>(TOKENS.UserService);
}

/**
 * 用户 Query Resolvers
 */
const Query: QueryResolvers = {
  /**
   * 获取当前用户
   */
  me: async (_parent, _args, context) => {
    const { user, logger } = context;

    if (!user) {
      logger.debug('未认证用户访问 me 查询');
      return null;
    }

    const userService = getUserService(context);
    const currentUser = await userService.getUserById(user.id);

    if (!currentUser) {
      return null;
    }

    logger.info('获取当前用户', { userId: user.id });
    return toGQLUser(currentUser);
  },

  /**
   * 根据 ID 获取用户
   */
  user: async (_parent, args, context) => {
    const { logger } = context;
    logger.info('查询用户', { userId: args.id });

    const userService = getUserService(context);
    const user = await userService.getUserById(args.id);

    return user ? toGQLUser(user) : null;
  },

  /**
   * 获取用户列表
   */
  users: async (_parent, args, context) => {
    const { logger } = context;

    const page = args.page ?? 1;
    const pageSize = args.pageSize ?? 10;

    logger.info('查询用户列表', { page, pageSize });

    const userService = getUserService(context);
    const result = await userService.getUsers(page, pageSize);

    return {
      items: result.items.map(toGQLUser),
      total: result.total,
      page: result.page,
      pageSize: result.pageSize,
      totalPages: result.totalPages,
    } satisfies GQLUserList;
  },
};

/**
 * 用户 Mutation Resolvers
 */
const Mutation: MutationResolvers = {
  /**
   * 创建用户
   */
  createUser: async (_parent, args, context) => {
    const { logger } = context;

    // 验证输入
    const input = validateInput(createUserInputSchema, args.input);

    logger.info('创建用户', { username: input.username, email: input.email });

    const userService = getUserService(context);
    const user = await userService.createUser(input);

    return toGQLUser(user);
  },

  /**
   * 更新用户
   */
  updateUser: async (_parent, args, context) => {
    const { logger } = context;

    // 验证输入
    const input = validateInput(updateUserInputSchema, args.input);

    logger.info('更新用户', { userId: args.id, ...input });

    const userService = getUserService(context);
    const user = await userService.updateUser(args.id, input);

    return toGQLUser(user);
  },

  /**
   * 删除用户
   */
  deleteUser: async (_parent, args, context) => {
    const { logger } = context;

    logger.info('删除用户', { userId: args.id });

    const userService = getUserService(context);
    return userService.deleteUser(args.id);
  },
};

/**
 * 用户 Resolvers
 *
 * 导出符合 codegen 生成的 Resolvers 类型
 */
export const userResolvers: Resolvers = {
  Query,
  Mutation,
};
