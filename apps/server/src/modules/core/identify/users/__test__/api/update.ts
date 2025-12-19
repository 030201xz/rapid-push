/**
 * 更新指定用户 API 测试
 *
 * 测试流程：
 * 1. 管理员登录
 * 2. 创建测试用户
 * 3. 以测试用户身份更新自己的信息（需验证所有权）
 * 4. 验证更新成功
 * 5. 清理测试数据
 *
 * 运行: bun run src/modules/core/identify/users/__test__/api/update.ts
 */

import { env } from '@/common/env';
import { createClient, type Client } from '@client/index';
import { createLogger } from '@rapid-s/logger';

// ========== Logger 实例 ==========
const logger = createLogger({ namespace: 'Test:UserUpdate' });

// ========== 测试配置 ==========
const API_URL = `http://${env.host}:${env.port}/trpc`;

// 已初始化的系统管理员账户
const ADMIN_USER = {
  username: 'admin',
  password: 'Admin@123456',
};

// 测试用户
const TEST_USER = {
  username: `test_update_${Date.now()}`,
  email: `test_update_${Date.now()}@test.com`,
  nickname: '测试更新用户',
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

/** 普通用户登录 */
async function userLogin(username: string, password: string) {
  logger.info('测试用户登录...', { username });

  const client = createClient(API_URL);
  const auth = getAuthApi(client);
  const result = await auth.login.mutate({ username, password });

  if (!result.success) {
    throw new Error(`用户登录失败: ${result.errorMessage}`);
  }

  logger.info('测试用户登录成功');
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

/** 测试用户更新自己的信息 */
async function testUpdateSelf(
  userToken: string,
  userId: string,
  originalNickname: string | null
) {
  logger.info('测试用户更新自己的信息...');

  const authedClient = createClient(API_URL, { token: userToken });
  const usersApi = getUsersApi(authedClient);

  const newNickname = `更新后昵称_${Date.now()}`;

  // 用户更新自己的信息
  const updatedUser = await usersApi.update.mutate({
    id: userId,
    nickname: newNickname,
  });

  if (!updatedUser) {
    throw new Error('更新用户信息失败');
  }

  logger.info('用户信息已更新', {
    id: updatedUser.id,
    nickname: updatedUser.nickname,
  });

  // 验证更新成功
  if (updatedUser.nickname !== newNickname) {
    throw new Error('昵称更新失败');
  }

  return updatedUser;
}

/** 测试用户无法更新他人信息 */
async function testCannotUpdateOthers(
  userToken: string,
  otherUserId: string
) {
  logger.info('测试用户无法更新他人信息...', {
    targetUserId: otherUserId,
  });

  const authedClient = createClient(API_URL, { token: userToken });
  const usersApi = getUsersApi(authedClient);

  try {
    await usersApi.update.mutate({
      id: otherUserId,
      nickname: '非法更新',
    });
    throw new Error('应该无法更新他人信息');
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.includes('只能操作自己的数据')
    ) {
      logger.info('正确拒绝更新他人信息');
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
  logger.info('开始更新指定用户 API 测试', { apiUrl: API_URL });

  let adminToken: string | undefined;
  let testUserId: string | undefined;

  try {
    // 1. 管理员登录
    adminToken = await adminLogin();

    // 2. 创建测试用户
    const testUser = await createTestUser(adminToken);
    testUserId = testUser.id;

    // 3. 激活测试用户（新创建的用户可能是 pending_verification 状态）
    const authedClient = createClient(API_URL, { token: adminToken });
    await authedClient.core.identify.users.activate.mutate({
      id: testUserId,
    });
    logger.info('测试用户已激活');

    // 4. 测试用户登录
    const userToken = await userLogin(
      TEST_USER.username,
      TEST_USER.password
    );

    // 5. 测试用户更新自己的信息
    await testUpdateSelf(userToken, testUserId, testUser.nickname);

    // 6. 获取管理员 ID 用于测试无法更新他人
    const adminUser =
      await authedClient.core.identify.users.byUsername.query({
        username: ADMIN_USER.username,
      });
    if (adminUser) {
      await testCannotUpdateOthers(userToken, adminUser.id);
    }

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
