/**
 * 删除用户 API 测试
 *
 * 测试流程：
 * 1. 管理员登录
 * 2. 创建测试用户
 * 3. 管理员删除测试用户
 * 4. 验证用户已被删除
 *
 * 运行: bun run src/modules/core/identify/users/__test__/api/delete.ts
 */

import { env } from '@/common/env';
import { createClient, type Client } from '@client/index';
import { createLogger } from '@rapid-s/logger';

// ========== Logger 实例 ==========
const logger = createLogger({ namespace: 'Test:UserDelete' });

// ========== 测试配置 ==========
const API_URL = `http://${env.host}:${env.port}/trpc`;

// 已初始化的系统管理员账户
const ADMIN_USER = {
  username: 'admin',
  password: 'Admin@123456',
};

// 测试用户
const TEST_USER = {
  username: `test_delete_${Date.now()}`,
  email: `test_delete_${Date.now()}@test.com`,
  nickname: '测试删除用户',
  password: 'TestUser@123456',
};

// ========== 路由别名 ==========
const getAuthApi = (client: Client) => client.core.identify.auth;
const getUsersApi = (client: Client) => client.core.identify.users;

// ========== 辅助函数 ==========

/** 生成密码哈希 */
async function hashPassword(plain: string): Promise<string> {
  return Bun.password.hash(plain);
}

/** 管理员登录 */
async function adminLogin() {
  logger.info('管理员登录...');

  const client = createClient(API_URL);
  const auth = getAuthApi(client);
  const result = await auth.login.mutate({
    username: ADMIN_USER.username,
    password: ADMIN_USER.password,
  });

  if (!result.success) {
    throw new Error(`管理员登录失败: ${result.errorMessage}`);
  }

  logger.info('管理员登录成功');
  return result.accessToken!;
}

// ========== 测试用例 ==========

/** 创建测试用户 */
async function createTestUser(adminToken: string) {
  logger.info('创建测试用户...', { username: TEST_USER.username });

  const authedClient = createClient(API_URL, { token: adminToken });
  const usersApi = getUsersApi(authedClient);

  const passwordHash = await hashPassword(TEST_USER.password);

  const newUser = await usersApi.create.mutate({
    username: TEST_USER.username,
    passwordHash,
    email: TEST_USER.email,
    nickname: TEST_USER.nickname,
  });

  logger.info('测试用户创建成功', {
    id: newUser.id,
    username: newUser.username,
  });

  return newUser;
}

/** 测试管理员删除用户 */
async function testDeleteUser(adminToken: string, userId: string) {
  logger.info('测试管理员删除用户...', { userId });

  const authedClient = createClient(API_URL, { token: adminToken });
  const usersApi = getUsersApi(authedClient);

  await usersApi.delete.mutate({ id: userId });

  logger.info('用户删除成功');
}

/** 验证用户已被删除 */
async function verifyUserDeleted(
  adminToken: string,
  username: string
) {
  logger.info('验证用户已被删除...', { username });

  const authedClient = createClient(API_URL, { token: adminToken });
  const usersApi = getUsersApi(authedClient);

  const user = await usersApi.byUsername.query({ username });

  // 软删除的用户查询时应返回 null
  if (user === null) {
    logger.info('用户已被删除（返回 null）');
    return;
  }

  // 如果用户仍存在，检查状态
  if (user.status === 'deleted') {
    logger.info('用户已被软删除', { status: user.status });
    return;
  }

  throw new Error('用户删除后仍然可查询');
}

/** 测试普通用户无法删除用户 */
async function testNonAdminCannotDelete(
  userToken: string,
  targetUserId: string
) {
  logger.info('测试普通用户无法删除用户...');

  const authedClient = createClient(API_URL, { token: userToken });
  const usersApi = getUsersApi(authedClient);

  try {
    await usersApi.delete.mutate({ id: targetUserId });
    throw new Error('普通用户不应该能删除用户');
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.includes('需要管理员权限')
    ) {
      logger.info('正确拒绝普通用户删除操作');
    } else {
      throw error;
    }
  }
}

/** 测试删除不存在的用户 */
async function testDeleteNonExistent(adminToken: string) {
  logger.info('测试删除不存在的用户...');

  const authedClient = createClient(API_URL, { token: adminToken });
  const usersApi = getUsersApi(authedClient);

  const fakeId = '00000000-0000-0000-0000-000000000000';

  try {
    await usersApi.delete.mutate({ id: fakeId });
    throw new Error('删除不存在的用户应该报错');
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.includes('用户不存在')
    ) {
      logger.info('正确拒绝删除不存在的用户');
    } else {
      throw error;
    }
  }
}

// ========== 主测试流程 ==========

async function main() {
  logger.info('开始删除用户 API 测试', { apiUrl: API_URL });

  try {
    // 1. 管理员登录
    const adminToken = await adminLogin();

    // 2. 创建测试用户
    const testUser = await createTestUser(adminToken);

    // 3. 测试删除不存在的用户
    await testDeleteNonExistent(adminToken);

    // 4. 测试管理员删除用户
    await testDeleteUser(adminToken, testUser.id);

    // 5. 验证用户已被删除
    await verifyUserDeleted(adminToken, TEST_USER.username);

    logger.info('所有测试通过！');
  } catch (error) {
    logger.error('测试失败', { error });
    process.exitCode = 1;
  }
}

// 运行测试
main();
