/**
 * 激活用户 API 测试
 *
 * 测试流程：
 * 1. 管理员登录
 * 2. 创建测试用户（默认为 pending_verification 状态）
 * 3. 激活测试用户
 * 4. 验证用户状态变为 active
 * 5. 清理测试数据
 *
 * 运行: bun run src/modules/core/identify/users/__test__/api/activate.ts
 */

import { env } from '@/common/env';
import { createClient, type Client } from '@client/index';
import { createLogger } from '@rapid-s/logger';

// ========== Logger 实例 ==========
const logger = createLogger({ namespace: 'Test:UserActivate' });

// ========== 测试配置 ==========
const API_URL = `http://${env.host}:${env.port}/trpc`;

// 已初始化的系统管理员账户
const ADMIN_USER = {
  username: 'admin',
  password: 'Admin@123456',
};

// 测试用户
const TEST_USER = {
  username: `test_activate_${Date.now()}`,
  email: `test_activate_${Date.now()}@test.com`,
  nickname: '测试激活用户',
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
    status: newUser.status,
  });

  return newUser;
}

/** 测试激活用户 */
async function testActivateUser(adminToken: string, userId: string) {
  logger.info('测试激活用户...', { userId });

  const authedClient = createClient(API_URL, { token: adminToken });
  const usersApi = getUsersApi(authedClient);

  const activatedUser = await usersApi.activate.mutate({
    id: userId,
  });

  if (!activatedUser) {
    throw new Error('激活用户失败');
  }

  logger.info('用户激活成功', {
    id: activatedUser.id,
    status: activatedUser.status,
  });

  // 验证状态变为 active
  if (activatedUser.status !== 'active') {
    throw new Error(
      `用户状态应为 active，实际为 ${activatedUser.status}`
    );
  }

  return activatedUser;
}

/** 测试重复激活已激活用户 */
async function testActivateAlreadyActive(
  adminToken: string,
  userId: string
) {
  logger.info('测试重复激活已激活用户...');

  const authedClient = createClient(API_URL, { token: adminToken });
  const usersApi = getUsersApi(authedClient);

  // 重复激活应该成功或者抛出特定错误
  try {
    const user = await usersApi.activate.mutate({ id: userId });
    logger.info('重复激活成功（幂等操作）', { status: user?.status });
  } catch (error) {
    if (error instanceof Error && error.message.includes('已激活')) {
      logger.info('正确提示用户已激活');
    } else {
      throw error;
    }
  }
}

/** 测试激活不存在的用户 */
async function testActivateNonExistent(adminToken: string) {
  logger.info('测试激活不存在的用户...');

  const authedClient = createClient(API_URL, { token: adminToken });
  const usersApi = getUsersApi(authedClient);

  const fakeId = '00000000-0000-0000-0000-000000000000';

  try {
    await usersApi.activate.mutate({ id: fakeId });
    throw new Error('激活不存在的用户应该报错');
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.includes('用户不存在')
    ) {
      logger.info('正确拒绝激活不存在的用户');
    } else {
      throw error;
    }
  }
}

/** 删除测试用户 */
async function deleteTestUser(adminToken: string, userId: string) {
  logger.info('删除测试用户...', { userId });

  const authedClient = createClient(API_URL, { token: adminToken });
  const usersApi = getUsersApi(authedClient);

  await usersApi.delete.mutate({ id: userId });

  logger.info('测试用户已删除');
}

// ========== 主测试流程 ==========

async function main() {
  logger.info('开始激活用户 API 测试', { apiUrl: API_URL });

  let adminToken: string | undefined;
  let testUserId: string | undefined;

  try {
    // 1. 管理员登录
    adminToken = await adminLogin();

    // 2. 创建测试用户
    const testUser = await createTestUser(adminToken);
    testUserId = testUser.id;

    // 3. 测试激活不存在的用户
    await testActivateNonExistent(adminToken);

    // 4. 测试激活用户
    await testActivateUser(adminToken, testUserId);

    // 5. 测试重复激活
    await testActivateAlreadyActive(adminToken, testUserId);

    logger.info('所有测试通过！');
  } catch (error) {
    logger.error('测试失败', { error });
    process.exitCode = 1;
  } finally {
    // 清理测试数据
    if (adminToken && testUserId) {
      try {
        await deleteTestUser(adminToken, testUserId);
      } catch (cleanupError) {
        logger.warn('清理测试数据失败', { error: cleanupError });
      }
    }
  }
}

// 运行测试
main();
