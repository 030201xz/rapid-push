/**
 * 用户仓储接口
 *
 * 定义数据访问的契约，具体实现在 infrastructure 层
 */

import type { User, UserId } from './user.entity';

/**
 * 用户仓储接口
 *
 * 包含所有用户数据访问方法
 */
export interface IUserRepository {
  /** 根据 ID 查找用户 */
  findById(id: UserId): Promise<User | null>;

  /** 查找所有用户 */
  findAll(): Promise<User[]>;

  /** 保存用户（新增或更新） */
  save(entity: User): Promise<User>;

  /** 删除用户 */
  delete(id: UserId): Promise<void>;

  /** 根据用户名查找用户 */
  findByUsername(username: string): Promise<User | null>;

  /** 根据邮箱查找用户 */
  findByEmail(email: string): Promise<User | null>;

  /** 检查用户名是否已存在 */
  existsByUsername(username: string): Promise<boolean>;

  /** 检查邮箱是否已存在 */
  existsByEmail(email: string): Promise<boolean>;

  /** 分页查询用户 */
  findPaginated(
    page: number,
    pageSize: number,
  ): Promise<{
    items: User[];
    total: number;
  }>;
}
