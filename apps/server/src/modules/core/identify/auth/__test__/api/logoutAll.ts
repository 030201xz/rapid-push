/**
 * 退出所有会话 API 测试
 *
 * 测试流程：
 * 1. 使用管理员账户登录多次，模拟多设备登录
 * 2. 调用 logoutAll 接口退出所有会话
 * 3. 验证所有 Token 均失效
 *
 * 运行: bun run src/modules/core/identify/auth/__test__/api/logoutAll.ts
 */

import { env } from '@/common/env';
import { createClient, type Client } from '@client/index';
import { createLogger } from '@rapid-s/logger';

// ========== Logger 实例 ==========
const logger = createLogger({ namespace: 'Test:Auth:LogoutAll' });

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
async function login(client: Client, deviceName?: string) {
  logger.info('登录获取 Token...', { deviceName });

  const auth = getAuthApi(client);
  const result = await auth.login.mutate({
    username: TEST_USER.username,
    password: TEST_USER.password,
    deviceName,
  });

  if (!result.success) {
    throw new Error(`登录失败: ${result.errorMessage}`);
  }

  logger.info('登录成功', { deviceName });

  return {
    accessToken: result.accessToken!,
    refreshToken: result.refreshToken!,
  };
}

/** 模拟多设备登录 */
async function loginMultipleDevices(client: Client) {
  logger.info('模拟多设备登录...');

  const tokens = await Promise.all([
    login(client, 'Device-1-Desktop'),
    login(client, 'Device-2-Mobile'),
    login(client, 'Device-3-Tablet'),
  ]);

  logger.info('多设备登录完成', { deviceCount: tokens.length });

  return tokens;
}

/** 测试退出所有会话 */
async function testLogoutAll(accessToken: string) {
  logger.info('测试退出所有会话...');

  const authedClient = createClient(API_URL, { token: accessToken });
  const auth = getAuthApi(authedClient);
  const result = await auth.logoutAll.mutate();

  if (!result.success) {
    throw new Error('退出所有会话失败');
  }

  logger.info('退出所有会话成功', { result });

  return result;
}

/** 测试所有 Token 均失效 */
async function testAllTokensInvalid(
  tokens: Array<{ accessToken: string; refreshToken: string }>
) {
  logger.info('验证所有 Token 均失效...');

  // 串行验证每个设备的 Token
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    if (!token) continue;
    const { accessToken } = token;
    const authedClient = createClient(API_URL, {
      token: accessToken,
    });
    const auth = getAuthApi(authedClient);

    try {
      await auth.me.query();
      // 如果请求成功，说明 Token 仍有效，测试失败
      throw new Error(`设备 ${i + 1} 的 Token 仍有效，预期应该失效`);
    } catch (error: unknown) {
      // 检查是否是我们主动抛出的"Token 仍有效"错误
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      if (errorMessage.includes('Token 仍有效')) {
        throw error;
      }
      // 其他错误（如 UNAUTHORIZED）表示 Token 已失效，符合预期
      logger.info(`设备 ${i + 1} 的 Token 已失效`, {
        error: errorMessage,
      });
    }
  }

  logger.info('所有 Token 均已失效');
}

/** 测试退出所有会话后可重新登录 */
async function testReloginAfterLogoutAll(client: Client) {
  logger.info('测试退出所有会话后可重新登录...');

  const auth = getAuthApi(client);
  const result = await auth.login.mutate({
    username: TEST_USER.username,
    password: TEST_USER.password,
  });

  if (!result.success) {
    throw new Error(`重新登录失败: ${result.errorMessage}`);
  }

  logger.info('重新登录成功');
}

// ========== 主测试流程 ==========

async function main() {
  logger.info('开始退出所有会话 API 测试', { apiUrl: API_URL });

  const client = createClient(API_URL);

  try {
    // 1. 模拟多设备登录
    const tokens = await loginMultipleDevices(client);

    // 2. 使用第一个设备的 Token 退出所有会话
    await testLogoutAll(tokens[0].accessToken);

    // 3. 验证所有 Token 失效
    await testAllTokensInvalid(tokens);

    // 4. 验证可重新登录
    await testReloginAfterLogoutAll(client);

    logger.info('所有测试通过！');
  } catch (error: unknown) {
    // 提取可读的错误信息，避免 JSON 序列化丢失信息
    const errorMessage =
      error instanceof Error ? error.message : String(error);
    const errorStack =
      error instanceof Error ? error.stack : undefined;
    logger.error('测试失败', {
      error: errorMessage,
      stack: errorStack,
    });
    process.exitCode = 1;
  }
}

// 运行测试
main();
