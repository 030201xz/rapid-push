/**
 * 获取当前用户信息 API 测试
 *
 * 测试流程：
 * 1. 使用管理员登录获取 Token
 * 2. 使用 Token 调用 me 接口获取当前用户信息
 * 3. 验证返回的用户信息与登录用户一致
 *
 * 运行: bun run src/modules/core/identify/users/__test__/api/me.ts
 */

import { env } from '@/common/env';
import { createClient, type Client } from '@client/index';
import { createLogger } from '@rapid-s/logger';

// ========== Logger 实例 ==========
const logger = createLogger({ namespace: 'Test:UserMe' });

// ========== 测试配置 ==========
const API_URL = `http://${env.host}:${env.port}/trpc`;

// 已初始化的系统管理员账户
const ADMIN_USER = {
  username: 'admin',
  password: 'Admin@123456',
};

// ========== 路由别名 ==========
const getAuthApi = (client: Client) => client.core.identify.auth;
const getUsersApi = (client: Client) => client.core.identify.users;

// ========== 测试用例 ==========

/** 测试管理员登录 */
async function testAdminLogin(client: Client) {
  logger.info('管理员登录...');

  const auth = getAuthApi(client);
  const result = await auth.login.mutate({
    username: ADMIN_USER.username,
    password: ADMIN_USER.password,
  });

  if (!result.success) {
    throw new Error(`管理员登录失败: ${result.errorMessage}`);
  }

  logger.info('管理员登录成功', { user: result.user?.username });

  return {
    accessToken: result.accessToken!,
    refreshToken: result.refreshToken!,
    user: result.user!,
  };
}

/** 测试获取当前用户信息（需登录） */
async function testGetMe(
  accessToken: string,
  expectedUsername: string
) {
  logger.info('测试获取当前用户信息...');

  const authedClient = createClient(API_URL, { token: accessToken });
  const usersApi = getUsersApi(authedClient);

  const user = await usersApi.me.query();

  if (!user) {
    throw new Error('获取当前用户信息失败');
  }

  logger.info('获取当前用户信息成功', {
    id: user.id,
    username: user.username,
    email: user.email,
    status: user.status,
  });

  // 验证返回的用户名与登录用户一致
  if (user.username !== expectedUsername) {
    throw new Error(
      `返回的用户名 ${user.username} 与登录用户 ${expectedUsername} 不一致`
    );
  }

  return user;
}

/** 测试未登录访问 me 接口 */
async function testUnauthorizedMe() {
  logger.info('测试未登录访问 me 接口...');

  const client = createClient(API_URL);
  const usersApi = getUsersApi(client);

  try {
    await usersApi.me.query();
    throw new Error('未登录访问 me 接口应返回 401');
  } catch (error) {
    // 验证错误类型
    if (
      error instanceof Error &&
      error.message.includes('请先登录')
    ) {
      logger.info('未登录访问正确返回 401');
    } else {
      throw error;
    }
  }
}

// ========== 主测试流程 ==========

async function main() {
  logger.info('开始获取当前用户信息 API 测试', { apiUrl: API_URL });

  const client = createClient(API_URL);

  try {
    // 1. 测试未登录访问
    await testUnauthorizedMe();

    // 2. 管理员登录
    const { accessToken } = await testAdminLogin(client);

    // 3. 获取当前用户信息
    await testGetMe(accessToken, ADMIN_USER.username);

    logger.info('所有测试通过！');
  } catch (error) {
    logger.error('测试失败', { error });
    process.exitCode = 1;
  }
}

// 运行测试
main();
