/**
 * 用户应用服务
 *
 * 直接包含业务逻辑，Resolver 调用此服务
 * 架构：Resolver → Service → Repository
 */

import { inject, injectable } from '../../core/di';
import { TOKENS } from '../../core/di/tokens';
import { alreadyExists, notFound } from '../../core/errors';
import { type User, createUser, createUserId } from './user.entity';
import type { IPasswordStrategy } from './user.password';
import type { IUserRepository } from './user.repository';
import type { CreateUserInputDTO, UpdateUserInputDTO } from './user.schema';

/** 用户列表分页结果 */
interface UserListResult {
  items: User[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/**
 * 用户服务
 *
 * 包含所有用户相关的业务逻辑
 */
@injectable()
export class UserService {
  constructor(
    @inject(TOKENS.UserRepository) private userRepository: IUserRepository,
    @inject(TOKENS.PasswordStrategy)
    private passwordStrategy: IPasswordStrategy,
  ) {}

  /**
   * 创建用户
   *
   * 验证唯一性约束，加密密码，创建并保存用户
   */
  async createUser(params: CreateUserInputDTO): Promise<User> {
    // 检查用户名是否已存在
    const usernameExists = await this.userRepository.existsByUsername(
      params.username,
    );
    if (usernameExists) {
      throw alreadyExists('User', 'username');
    }

    // 检查邮箱是否已存在
    const emailExists = await this.userRepository.existsByEmail(params.email);
    if (emailExists) {
      throw alreadyExists('User', 'email');
    }

    // 加密密码
    const passwordHash = await this.passwordStrategy.hash(params.password);

    // 创建用户实体
    const user = createUser({
      id: this.generateUserId(),
      username: params.username,
      email: params.email,
      passwordHash,
    });

    // 保存并返回
    return this.userRepository.save(user);
  }

  /**
   * 根据 ID 获取用户
   */
  async getUserById(userId: string): Promise<User | null> {
    return this.userRepository.findById(createUserId(userId));
  }

  /**
   * 根据 ID 获取用户（必须存在）
   */
  async getUserByIdOrThrow(userId: string): Promise<User> {
    const user = await this.getUserById(userId);
    if (!user) {
      throw notFound('User', userId);
    }
    return user;
  }

  /**
   * 根据用户名获取用户
   */
  async getUserByUsername(username: string): Promise<User | null> {
    return this.userRepository.findByUsername(username);
  }

  /**
   * 获取用户列表（分页）
   */
  async getUsers(page = 1, pageSize = 10): Promise<UserListResult> {
    const result = await this.userRepository.findPaginated(page, pageSize);
    const totalPages = Math.ceil(result.total / pageSize);

    return {
      items: result.items,
      total: result.total,
      page,
      pageSize,
      totalPages,
    };
  }

  /**
   * 更新用户
   */
  async updateUser(userId: string, params: UpdateUserInputDTO): Promise<User> {
    const user = await this.getUserByIdOrThrow(userId);

    // 构造更新后的用户
    const updatedUser: User = {
      ...user,
      username: params.username ?? user.username,
      email: params.email ?? user.email,
      updatedAt: new Date(),
    };

    return this.userRepository.save(updatedUser);
  }

  /**
   * 删除用户
   */
  async deleteUser(userId: string): Promise<boolean> {
    const user = await this.getUserById(userId);
    if (!user) {
      return false;
    }
    await this.userRepository.delete(user.id);
    return true;
  }

  /**
   * 生成用户 ID（UUID v4 格式）
   */
  private generateUserId(): string {
    return crypto.randomUUID();
  }
}
