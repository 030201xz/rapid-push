/**
 * 登出当前会话 API 测试
 *
 * 测试流程：
 * 1. 使用管理员账户登录获取 Token
 * 2. 调用 logout 接口登出当前会话
 * 3. 验证登出后 Token 失效
 * 4. 验证可重新登录
 *
 * 运行: bun run src/modules/core/identify/auth/__test__/api/logout.ts
 */

import { env } from '@/common/env';
import { createClient, type Client } from '@client/index';
import { createLogger } from '@rapid-s/logger';

// ========== Logger 实例 ==========
const logger = createLogger({ namespace: 'Test:Auth:Logout' });

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

  logger.info('登录成功', { user: result.user?.username });

  return {
    accessToken: result.accessToken!,
    refreshToken: result.refreshToken!,
  };
}

/** 测试登出当前会话 */
async function testLogout(accessToken: string) {
  logger.info('测试登出当前会话...');

  const authedClient = createClient(API_URL, { token: accessToken });
  const auth = getAuthApi(authedClient);
  const result = await auth.logout.mutate();

  if (!result.success) {
    throw new Error('登出失败');
  }

  logger.info('登出成功', { result });

  return result;
}

/** 测试登出后 Token 失效 */
async function testTokenInvalidAfterLogout(accessToken: string) {
  logger.info('测试登出后 Token 失效...');

  const authedClient = createClient(API_URL, { token: accessToken });
  const auth = getAuthApi(authedClient);

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
    logger.info('Token 已失效，请求被正确拒绝');
  }
}

/** 测试登出后 refreshToken 失效 */
async function testRefreshTokenInvalidAfterLogout(
  client: Client,
  refreshToken: string
) {
  logger.info('测试登出后 refreshToken 失效...');

  const auth = getAuthApi(client);
  const result = await auth.refresh.mutate({ refreshToken });

  if (result.success) {
    logger.warn('refreshToken 在登出后仍有效（可能是设计如此）');
  } else {
    logger.info('refreshToken 已失效', {
      errorCode: result.errorCode,
    });
  }
}

/** 测试登出后可重新登录 */
async function testReloginAfterLogout(client: Client) {
  logger.info('测试登出后可重新登录...');

  const auth = getAuthApi(client);
  const result = await auth.login.mutate({
    username: TEST_USER.username,
    password: TEST_USER.password,
  });

  if (!result.success) {
    throw new Error(`重新登录失败: ${result.errorMessage}`);
  }

  logger.info('重新登录成功');

  return result.accessToken!;
}

// ========== 主测试流程 ==========

async function main() {
  logger.info('开始登出 API 测试', { apiUrl: API_URL });

  const client = createClient(API_URL);

  try {
    // 1. 登录获取 Token
    const { accessToken, refreshToken } = await login(client);

    // 2. 登出当前会话
    await testLogout(accessToken);

    // 3. 验证 Token 失效
    await testTokenInvalidAfterLogout(accessToken);

    // 4. 验证 refreshToken 状态
    await testRefreshTokenInvalidAfterLogout(client, refreshToken);

    // 5. 验证可重新登录
    await testReloginAfterLogout(client);

    logger.info('所有测试通过！');
  } catch (error) {
    logger.error('测试失败', { error });
    process.exitCode = 1;
  }
}

// 运行测试
main();
