/**
 * 用户模块注册
 *
 * 在 DI 容器中注册用户模块的所有服务
 */

import { container } from '../../core/di';
import { TOKENS } from '../../core/di/tokens';
import { defaultPasswordStrategy } from './user.password';
import { DrizzleUserRepository } from './user.repository.impl';
import { UserService } from './user.service';

/**
 * 注册用户模块
 *
 * 将所有用户相关的服务注册到 DI 容器
 * 简化为：Repository + PasswordStrategy + Service
 */
export function registerUserModule(): void {
  // 注册仓储（使用 Drizzle 实现）
  container.registerSingleton(TOKENS.UserRepository, DrizzleUserRepository);

  // 注册密码策略
  container.registerInstance(TOKENS.PasswordStrategy, defaultPasswordStrategy);

  // 注册用户服务
  container.registerSingleton(TOKENS.UserService, UserService);
}
