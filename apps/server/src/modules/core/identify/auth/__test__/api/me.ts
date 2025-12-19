/**
 * 获取当前用户信息 API 测试
 *
 * 测试流程：
 * 1. 使用管理员账户登录获取 Token
 * 2. 调用 me 接口获取当前用户信息
 * 3. 验证返回的用户信息正确性
 * 4. 测试无 Token 访问被拒绝
 *
 * 运行: bun run src/modules/core/identify/auth/__test__/api/me.ts
 */

import { env } from '@/common/env';
import { createClient, type Client } from '@client/index';
import { createLogger } from '@rapid-s/logger';

// ========== Logger 实例 ==========
const logger = createLogger({ namespace: 'Test:Auth:Me' });

// ========== 测试配置 ==========
const API_URL = `http://${env.host}:${env.port}/trpc`;

// 测试用户凭证
const TEST_USER = {
  username: 'admin',
  password: 'Admin@123456',
};

// ========== 路由别名 ==========

/** 获取 auth 路由 */
const getAuthApi = (client: Client) => client.core.identify.auth;

// ========== 测试用例 ==========

/** 登录获取 Token */
async function login(client: Client) {
  logger.info('登录获取 Token...');

  const auth = getAuthApi(client);
  const result = await auth.login.mutate({
    username: TEST_USER.username,
    password: TEST_USER.password,
  });

  if (!result.success) {
    throw new Error(`登录失败: ${result.errorMessage}`);
  }

  logger.info('登录成功');

  return result.accessToken!;
}

/** 测试获取当前用户信息 */
async function testGetMe(accessToken: string) {
  logger.info('测试获取当前用户信息...');

  const authedClient = createClient(API_URL, { token: accessToken });
  const auth = getAuthApi(authedClient);
  const user = await auth.me.query();

  logger.info('获取用户信息成功', {
    id: user.id,
    username: user.username,
  });

  // 验证用户信息完整性
  if (!user.id || !user.username) {
    throw new Error('用户信息不完整');
  }

  return user;
}

/** 测试验证返回的用户信息与登录用户一致 */
async function testUserInfoMatch(accessToken: string) {
  logger.info('验证用户信息与登录用户一致...');

  const authedClient = createClient(API_URL, { token: accessToken });
  const auth = getAuthApi(authedClient);
  const user = await auth.me.query();

  if (user.username !== TEST_USER.username) {
    throw new Error(
      `用户名不匹配: 预期 ${TEST_USER.username}，实际 ${user.username}`
    );
  }

  logger.info('用户信息验证通过');
}

/** 测试无 Token 访问被拒绝 */
async function testUnauthorizedAccess(client: Client) {
  logger.info('测试无 Token 访问被拒绝...');

  const auth = getAuthApi(client);

  try {
    await auth.me.query();
    throw new Error('预期请求应被拒绝，但成功了');
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.includes('预期请求应被拒绝')
    ) {
      throw error;
    }
    logger.info('无 Token 访问被正确拒绝');
  }
}

/** 测试无效 Token 访问被拒绝 */
async function testInvalidTokenAccess() {
  logger.info('测试无效 Token 访问被拒绝...');

  const invalidClient = createClient(API_URL, {
    token: 'invalid-token',
  });
  const auth = getAuthApi(invalidClient);

  try {
    await auth.me.query();
    throw new Error('预期请求应被拒绝，但成功了');
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.includes('预期请求应被拒绝')
    ) {
      throw error;
    }
    logger.info('无效 Token 访问被正确拒绝');
  }
}

// ========== 主测试流程 ==========

async function main() {
  logger.info('开始获取当前用户 API 测试', { apiUrl: API_URL });

  const client = createClient(API_URL);

  try {
    // 1. 登录获取 Token
    const accessToken = await login(client);

    // 2. 获取当前用户信息
    await testGetMe(accessToken);

    // 3. 验证用户信息匹配
    await testUserInfoMatch(accessToken);

    // 4. 测试无 Token 访问
    await testUnauthorizedAccess(client);

    // 5. 测试无效 Token 访问
    await testInvalidTokenAccess();

    logger.info('所有测试通过！');
  } catch (error) {
    logger.error('测试失败', { error });
    process.exitCode = 1;
  }
}

// 运行测试
main();
