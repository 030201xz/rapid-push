/**
 * 用户模块门面
 *
 * 模块唯一对外出口，隐藏内部实现细节
 */

// 模块注册
export { registerUserModule } from './user.module';

// GraphQL Resolvers
export { userResolvers } from './user.resolver';

// 类型导出（供其他模块使用）
export type { User, UserId, UserStatus } from './user.entity';
export type { CreateUserInputDTO, UpdateUserInputDTO } from './user.schema';
