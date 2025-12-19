/**
 * 刷新 Token API 测试
 *
 * 测试流程：
 * 1. 使用管理员账户登录获取 Token
 * 2. 使用 refreshToken 刷新获取新 Token
 * 3. 验证新 Token 可正常使用
 * 4. 测试无效 refreshToken 刷新失败
 *
 * 运行: bun run src/modules/core/identify/auth/__test__/api/refresh.ts
 */

import { env } from '@/common/env';
import { createClient, type Client } from '@client/index';
import { createLogger } from '@rapid-s/logger';

// ========== Logger 实例 ==========
const logger = createLogger({ namespace: 'Test:Auth:Refresh' });

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

/** 登录获取初始 Token */
async function login(client: Client) {
  logger.info('登录获取初始 Token...');

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

/** 测试刷新 Token 成功 */
async function testRefreshSuccess(
  client: Client,
  refreshToken: string
) {
  logger.info('测试刷新 Token...');

  const auth = getAuthApi(client);
  const result = await auth.refresh.mutate({ refreshToken });

  if (!result.success) {
    throw new Error(`刷新 Token 失败: ${result.errorMessage}`);
  }

  logger.info('刷新 Token 成功', {
    hasNewAccessToken: !!result.accessToken,
    hasNewRefreshToken: !!result.refreshToken,
  });

  return {
    accessToken: result.accessToken!,
    refreshToken: result.refreshToken!,
    user: result.user,
  };
}

/** 测试新 Token 可用性 */
async function testNewTokenWorks(accessToken: string) {
  logger.info('验证新 Token 可用性...');

  const authedClient = createClient(API_URL, { token: accessToken });
  const auth = getAuthApi(authedClient);
  const user = await auth.me.query();

  logger.info('新 Token 验证成功', { username: user.username });

  return user;
}

/** 测试无效 refreshToken 刷新失败 */
async function testInvalidRefreshToken(client: Client) {
  logger.info('测试无效 refreshToken...');

  const auth = getAuthApi(client);
  const result = await auth.refresh.mutate({
    refreshToken: 'invalid-refresh-token',
  });

  if (result.success) {
    throw new Error('预期刷新应失败，但成功了');
  }

  logger.info('无效 refreshToken 正确被拒绝', {
    errorCode: result.errorCode,
    errorMessage: result.errorMessage,
  });
}

/** 测试已使用的 refreshToken 是否失效（Token 轮换） */
async function testUsedRefreshTokenInvalid(
  client: Client,
  oldRefreshToken: string
) {
  logger.info('测试已使用的 refreshToken 是否失效...');

  const auth = getAuthApi(client);
  const result = await auth.refresh.mutate({
    refreshToken: oldRefreshToken,
  });

  // 根据实现，旧 refreshToken 可能失效也可能仍有效
  // 这里记录结果即可
  if (result.success) {
    logger.warn('旧 refreshToken 仍有效（非 Token 轮换模式）');
  } else {
    logger.info('旧 refreshToken 已失效（Token 轮换模式）', {
      errorCode: result.errorCode,
    });
  }
}

// ========== 主测试流程 ==========

async function main() {
  logger.info('开始刷新 Token API 测试', { apiUrl: API_URL });

  const client = createClient(API_URL);

  try {
    // 1. 登录获取 Token
    const loginResult = await login(client);

    // 2. 刷新 Token
    const refreshResult = await testRefreshSuccess(
      client,
      loginResult.refreshToken
    );

    // 3. 验证新 Token 可用
    await testNewTokenWorks(refreshResult.accessToken);

    // 4. 测试无效 refreshToken
    await testInvalidRefreshToken(client);

    // 5. 测试旧 refreshToken 状态
    await testUsedRefreshTokenInvalid(
      client,
      loginResult.refreshToken
    );

    logger.info('所有测试通过！');
  } catch (error) {
    logger.error('测试失败', { error });
    process.exitCode = 1;
  }
}

// 运行测试
main();
