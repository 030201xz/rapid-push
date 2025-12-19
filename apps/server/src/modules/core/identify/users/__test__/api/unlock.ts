/**
 * 解锁用户 API 测试
 *
 * 测试流程：
 * 1. 管理员登录
 * 2. 创建并激活测试用户
 * 3. 锁定测试用户
 * 4. 解锁测试用户
 * 5. 验证用户状态变为 active
 * 6. 验证解锁后用户可以登录
 * 7. 清理测试数据
 *
 * 运行: bun run src/modules/core/identify/users/__test__/api/unlock.ts
 */

import { env } from '@/common/env';
import { createClient, type Client } from '@client/index';
import { createLogger } from '@rapid-s/logger';

// ========== Logger 实例 ==========
const logger = createLogger({ namespace: 'Test:UserUnlock' });

// ========== 测试配置 ==========
const API_URL = `http://${env.host}:${env.port}/trpc`;

// 已初始化的系统管理员账户
const ADMIN_USER = {
  username: 'admin',
  password: 'Admin@123456',
};

// 测试用户
const TEST_USER = {
  username: `test_unlock_${Date.now()}`,
  email: `test_unlock_${Date.now()}@test.com`,
  nickname: '测试解锁用户',
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

/** 创建、激活并锁定测试用户 */
async function createAndLockTestUser(adminToken: string) {
  logger.info('创建测试用户...', { username: TEST_USER.username });

  const authedClient = createClient(API_URL, { token: adminToken });
  const usersApi = getUsersApi(authedClient);

  const passwordHash = await hashPassword(TEST_USER.password);

  // 创建用户
  const newUser = await usersApi.create.mutate({
    username: TEST_USER.username,
    passwordHash,
    email: TEST_USER.email,
    nickname: TEST_USER.nickname,
  });

  logger.info('测试用户创建成功', {
    id: newUser.id,
    status: newUser.status,
  });

  // 激活用户
  await usersApi.activate.mutate({ id: newUser.id });
  logger.info('测试用户已激活');

  // 锁定用户
  const lockedUser = await usersApi.lock.mutate({
    id: newUser.id,
    reason: '测试锁定',
  });

  if (!lockedUser) {
    throw new Error('锁定用户失败');
  }

  logger.info('测试用户已锁定', { status: lockedUser.status });

  return lockedUser;
}

/** 测试解锁用户 */
async function testUnlockUser(adminToken: string, userId: string) {
  logger.info('测试解锁用户...', { userId });

  const authedClient = createClient(API_URL, { token: adminToken });
  const usersApi = getUsersApi(authedClient);

  const unlockedUser = await usersApi.unlock.mutate({ id: userId });

  if (!unlockedUser) {
    throw new Error('解锁用户失败');
  }

  logger.info('用户解锁成功', {
    id: unlockedUser.id,
    status: unlockedUser.status,
    lockReason: unlockedUser.lockReason,
    lockedAt: unlockedUser.lockedAt,
  });

  // 验证状态变为 active
  if (unlockedUser.status !== 'active') {
    throw new Error(
      `用户状态应为 active，实际为 ${unlockedUser.status}`
    );
  }

  // 验证锁定原因被清除
  if (unlockedUser.lockReason !== null) {
    throw new Error('解锁后锁定原因应被清除');
  }

  return unlockedUser;
}

/** 测试解锁后用户可以登录 */
async function testUnlockedUserCanLogin() {
  logger.info('测试解锁后用户可以登录...');

  const client = createClient(API_URL);
  const auth = getAuthApi(client);

  const result = await auth.login.mutate({
    username: TEST_USER.username,
    password: TEST_USER.password,
  });

  if (!result.success) {
    throw new Error(`解锁后用户登录失败: ${result.errorMessage}`);
  }

  logger.info('解锁后用户登录成功', { user: result.user?.username });
}

/** 测试解锁不存在的用户 */
async function testUnlockNonExistent(adminToken: string) {
  logger.info('测试解锁不存在的用户...');

  const authedClient = createClient(API_URL, { token: adminToken });
  const usersApi = getUsersApi(authedClient);

  const fakeId = '00000000-0000-0000-0000-000000000000';

  try {
    await usersApi.unlock.mutate({ id: fakeId });
    throw new Error('解锁不存在的用户应该报错');
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.includes('用户不存在')
    ) {
      logger.info('正确拒绝解锁不存在的用户');
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
  logger.info('开始解锁用户 API 测试', { apiUrl: API_URL });

  let adminToken: string | undefined;
  let testUserId: string | undefined;

  try {
    // 1. 管理员登录
    adminToken = await adminLogin();

    // 2. 创建并锁定测试用户
    const testUser = await createAndLockTestUser(adminToken);
    if (!testUser) {
      throw new Error('创建测试用户失败');
    }
    testUserId = testUser.id;

    // 3. 测试解锁不存在的用户
    await testUnlockNonExistent(adminToken);

    // 4. 测试解锁用户
    await testUnlockUser(adminToken, testUserId);

    // 5. 测试解锁后用户可以登录
    await testUnlockedUserCanLogin();

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
