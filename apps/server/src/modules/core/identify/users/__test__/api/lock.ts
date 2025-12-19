/**
 * 锁定用户 API 测试
 *
 * 测试流程：
 * 1. 管理员登录
 * 2. 创建并激活测试用户
 * 3. 锁定测试用户
 * 4. 验证用户状态变为 locked
 * 5. 验证被锁定用户无法登录
 * 6. 清理测试数据
 *
 * 运行: bun run src/modules/core/identify/users/__test__/api/lock.ts
 */

import { env } from '@/common/env';
import { createClient, type Client } from '@client/index';
import { createLogger } from '@rapid-s/logger';

// ========== Logger 实例 ==========
const logger = createLogger({ namespace: 'Test:UserLock' });

// ========== 测试配置 ==========
const API_URL = `http://${env.host}:${env.port}/trpc`;

// 已初始化的系统管理员账户
const ADMIN_USER = {
  username: 'admin',
  password: 'Admin@123456',
};

// 测试用户
const TEST_USER = {
  username: `test_lock_${Date.now()}`,
  email: `test_lock_${Date.now()}@test.com`,
  nickname: '测试锁定用户',
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

/** 创建并激活测试用户 */
async function createAndActivateTestUser(adminToken: string) {
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
  const activatedUser = await usersApi.activate.mutate({
    id: newUser.id,
  });

  if (!activatedUser) {
    throw new Error('激活用户失败');
  }

  logger.info('测试用户已激活', { status: activatedUser.status });

  return activatedUser;
}

/** 测试锁定用户 */
async function testLockUser(adminToken: string, userId: string) {
  logger.info('测试锁定用户...', { userId });

  const authedClient = createClient(API_URL, { token: adminToken });
  const usersApi = getUsersApi(authedClient);

  const lockReason = '测试锁定原因';

  const lockedUser = await usersApi.lock.mutate({
    id: userId,
    reason: lockReason,
  });

  if (!lockedUser) {
    throw new Error('锁定用户失败');
  }

  logger.info('用户锁定成功', {
    id: lockedUser.id,
    status: lockedUser.status,
    lockReason: lockedUser.lockReason,
    lockedAt: lockedUser.lockedAt,
  });

  // 验证状态变为 locked
  if (lockedUser.status !== 'locked') {
    throw new Error(
      `用户状态应为 locked，实际为 ${lockedUser.status}`
    );
  }

  // 验证锁定原因
  if (lockedUser.lockReason !== lockReason) {
    throw new Error('锁定原因不匹配');
  }

  return lockedUser;
}

/** 测试被锁定用户无法登录 */
async function testLockedUserCannotLogin() {
  logger.info('测试被锁定用户无法登录...');

  const client = createClient(API_URL);
  const auth = getAuthApi(client);

  try {
    await auth.login.mutate({
      username: TEST_USER.username,
      password: TEST_USER.password,
    });
    throw new Error('被锁定用户不应该能登录');
  } catch (error) {
    if (
      error instanceof Error &&
      (error.message.includes('账号已锁定') ||
        error.message.includes('locked') ||
        error.message.includes('账号状态异常'))
    ) {
      logger.info('正确拒绝锁定用户登录');
    } else {
      throw error;
    }
  }
}

/** 测试锁定不存在的用户 */
async function testLockNonExistent(adminToken: string) {
  logger.info('测试锁定不存在的用户...');

  const authedClient = createClient(API_URL, { token: adminToken });
  const usersApi = getUsersApi(authedClient);

  const fakeId = '00000000-0000-0000-0000-000000000000';

  try {
    await usersApi.lock.mutate({ id: fakeId, reason: '测试' });
    throw new Error('锁定不存在的用户应该报错');
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.includes('用户不存在')
    ) {
      logger.info('正确拒绝锁定不存在的用户');
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
  logger.info('开始锁定用户 API 测试', { apiUrl: API_URL });

  let adminToken: string | undefined;
  let testUserId: string | undefined;

  try {
    // 1. 管理员登录
    adminToken = await adminLogin();

    // 2. 创建并激活测试用户
    const testUser = await createAndActivateTestUser(adminToken);
    if (!testUser) {
      throw new Error('创建测试用户失败');
    }
    testUserId = testUser.id;

    // 3. 测试锁定不存在的用户
    await testLockNonExistent(adminToken);

    // 4. 测试锁定用户
    await testLockUser(adminToken, testUserId);

    // 5. 测试被锁定用户无法登录
    await testLockedUserCannotLogin();

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
