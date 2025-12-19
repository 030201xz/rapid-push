/**
 * 用户创建 API 测试
 *
 * 测试流程：
 * 1. 使用已初始化的系统管理员登录获取 Token
 * 2. 使用管理员 Token 调用 create user API
 * 3. 验证创建成功
 * 4. 通过 API 清理测试数据
 *
 * 运行: bun run src/modules/core/identify/users/__test__/api/create.ts
 */

import { env } from '@/common/env';
import { createClient, type Client } from '@client/index';
import { createLogger } from '@rapid-s/logger';

// ========== Logger 实例 ==========
const logger = createLogger({ namespace: 'Test:UserCreate' });

// ========== 测试配置 ==========

const API_URL = `http://${env.host}:${env.port}/trpc`;

// 已初始化的系统管理员账户（来自 scripts/init/config）
const ADMIN_USER = {
  username: 'admin',
  password: 'Admin@123456',
};

// 待创建的测试用户
const NEW_USER = {
  username: `test_user_${Date.now()}`,
  email: `test_user_${Date.now()}@test.com`,
  nickname: '测试用户',
  password: 'TestUser@123456',
};

// ========== 路由别名 ==========

const getAuthApi = (client: Client) => client.core.identify.auth;
const getUsersApi = (client: Client) => client.core.identify.users;

// ========== 测试辅助函数 ==========

/** 生成密码哈希 */
async function hashPassword(plain: string): Promise<string> {
  return Bun.password.hash(plain);
}

// ========== 测试用例 ==========

/** 测试管理员登录 */
async function testAdminLogin(client: Client) {
  logger.info('测试管理员登录...');

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
  };
}

/** 测试创建用户 */
async function testCreateUser(accessToken: string) {
  logger.info('测试创建用户...');

  const authedClient = createClient(API_URL, { token: accessToken });
  const usersApi = getUsersApi(authedClient);

  // 生成密码哈希
  const passwordHash = await hashPassword(NEW_USER.password);

  const newUser = await usersApi.create.mutate({
    username: NEW_USER.username,
    passwordHash,
    email: NEW_USER.email,
    nickname: NEW_USER.nickname,
  });

  logger.info('用户创建成功', {
    id: newUser.id,
    username: newUser.username,
    email: newUser.email,
    status: newUser.status,
  });

  return newUser;
}

/** 测试查询用户 */
async function testGetUser(accessToken: string, username: string) {
  logger.info('测试查询用户...', { username });

  const authedClient = createClient(API_URL, { token: accessToken });
  const usersApi = getUsersApi(authedClient);
  const user = await usersApi.byUsername.query({ username });

  if (!user) {
    throw new Error(`用户 ${username} 不存在`);
  }

  logger.info('用户查询成功', {
    id: user.id,
    username: user.username,
    email: user.email,
  });

  return user;
}

/** 测试用户列表 */
async function testListUsers(accessToken: string) {
  logger.info('测试用户列表...');

  const authedClient = createClient(API_URL, { token: accessToken });
  const usersApi = getUsersApi(authedClient);
  const userList = await usersApi.list.query();

  logger.info('获取用户列表成功', { count: userList.length });

  return userList;
}

/** 测试删除用户（清理测试数据） */
async function testDeleteUser(accessToken: string, userId: string) {
  logger.info('删除测试用户...', { userId });

  const authedClient = createClient(API_URL, { token: accessToken });
  const usersApi = getUsersApi(authedClient);

  await usersApi.delete.mutate({ id: userId });

  logger.info('用户删除成功', { userId });
}

// ========== 主测试流程 ==========

async function main() {
  logger.info('开始用户创建 API 测试', { apiUrl: API_URL });

  const client = createClient(API_URL);
  let newUserId: string | undefined;
  let accessToken: string | undefined;

  try {
    // 1. 管理员登录
    const loginResult = await testAdminLogin(client);
    accessToken = loginResult.accessToken;

    // 2. 创建新用户
    const newUser = await testCreateUser(accessToken);
    newUserId = newUser.id;

    // 3. 查询创建的用户
    await testGetUser(accessToken, NEW_USER.username);

    // 4. 获取用户列表
    await testListUsers(accessToken);

    logger.info('所有测试通过！');
  } catch (error) {
    logger.error('测试失败', { error });
    process.exitCode = 1;
  } finally {
    // 清理测试数据：通过 API 删除创建的用户
    if (newUserId && accessToken) {
      try {
        await testDeleteUser(accessToken, newUserId);
      } catch (cleanupError) {
        logger.warn('清理测试数据失败', { error: cleanupError });
      }
    }
  }
}

// 运行测试
main();
