/**
 * 撤销指定会话 API 测试
 *
 * 测试流程：
 * 1. 使用管理员账户登录多次，模拟多设备登录
 * 2. 获取会话列表
 * 3. 使用 revokeSession 撤销指定会话
 * 4. 验证被撤销会话的 Token 失效
 * 5. 验证其他会话仍然有效
 *
 * 运行: bun run src/modules/core/identify/auth/__test__/api/revokeSession.ts
 */

import { env } from '@/common/env';
import { createClient, type Client } from '@client/index';
import { createLogger } from '@rapid-s/logger';

// ========== Logger 实例 ==========
const logger = createLogger({ namespace: 'Test:Auth:RevokeSession' });

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
  const auth = getAuthApi(client);
  const result = await auth.login.mutate({
    username: TEST_USER.username,
    password: TEST_USER.password,
    deviceName,
  });

  if (!result.success) {
    throw new Error(`登录失败: ${result.errorMessage}`);
  }

  return result.accessToken!;
}

/** 模拟多设备登录 */
async function loginMultipleDevices(client: Client) {
  logger.info('模拟多设备登录...');

  // 串行登录以确保获取不同的 session
  const token1 = await login(client, 'RevokeTest-Device-1');
  const token2 = await login(client, 'RevokeTest-Device-2');

  logger.info('多设备登录完成');

  return [token1, token2];
}

/** 获取会话列表 */
async function getSessions(accessToken: string) {
  const authedClient = createClient(API_URL, { token: accessToken });
  const auth = getAuthApi(authedClient);
  return auth.sessions.query();
}

/** 测试撤销指定会话 */
async function testRevokeSession(
  accessToken: string,
  sessionId: string
) {
  logger.info('测试撤销指定会话...', { sessionId });

  const authedClient = createClient(API_URL, { token: accessToken });
  const auth = getAuthApi(authedClient);
  const result = await auth.revokeSession.mutate({ sessionId });

  if (!result.success) {
    const message = 'message' in result ? result.message : '未知错误';
    throw new Error(`撤销会话失败: ${message}`);
  }

  logger.info('撤销会话成功');

  return result;
}

/** 测试被撤销会话的 Token 失效 */
async function testRevokedTokenInvalid(accessToken: string) {
  logger.info('验证被撤销会话的 Token 失效...');

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
    logger.info('被撤销会话的 Token 已失效');
  }
}

/** 测试其他会话仍然有效 */
async function testOtherSessionStillValid(accessToken: string) {
  logger.info('验证其他会话仍然有效...');

  const authedClient = createClient(API_URL, { token: accessToken });
  const auth = getAuthApi(authedClient);
  const user = await auth.me.query();

  logger.info('其他会话验证通过', { username: user.username });
}

/** 测试撤销不存在的会话 */
async function testRevokeNonExistentSession(accessToken: string) {
  logger.info('测试撤销不存在的会话...');

  const authedClient = createClient(API_URL, { token: accessToken });
  const auth = getAuthApi(authedClient);

  // 使用随机 UUID 作为不存在的 sessionId
  const fakeSessionId = '00000000-0000-0000-0000-000000000000';
  const result = await auth.revokeSession.mutate({
    sessionId: fakeSessionId,
  });

  if (result.success) {
    logger.warn('撤销不存在的会话意外成功');
  } else {
    const message = 'message' in result ? result.message : '未知错误';
    logger.info('撤销不存在的会话被正确拒绝', {
      message,
    });
  }
}

/** 清理：退出所有会话 */
async function cleanup(accessToken: string) {
  logger.info('清理：退出所有测试会话...');

  try {
    const authedClient = createClient(API_URL, {
      token: accessToken,
    });
    const auth = getAuthApi(authedClient);
    await auth.logoutAll.mutate();
    logger.info('清理完成');
  } catch (error) {
    logger.warn('清理失败', { error });
  }
}

// ========== 主测试流程 ==========

async function main() {
  logger.info('开始撤销会话 API 测试', { apiUrl: API_URL });

  const client = createClient(API_URL);
  let validToken: string | undefined;

  try {
    // 1. 模拟多设备登录
    const tokens = await loginMultipleDevices(client);
    const token1 = tokens[0];
    const token2 = tokens[1];
    if (!token1 || !token2) {
      throw new Error('登录失败，无法获取 Token');
    }
    validToken = token1;

    // 2. 获取会话列表
    const sessions = await getSessions(token1);
    logger.info('获取会话列表', { sessionCount: sessions.length });

    if (sessions.length < 2) {
      throw new Error('会话数量不足，无法测试撤销功能');
    }

    // 3. 找到 token2 对应的会话（通常是最新的那个）
    // 注意：需要根据实际的 session 结构来确定
    const sessionToRevoke = sessions[sessions.length - 1];
    if (!sessionToRevoke) {
      throw new Error('无法获取要撤销的会话');
    }

    // 4. 撤销第二个设备的会话
    await testRevokeSession(token1, sessionToRevoke.id);

    // 5. 验证被撤销的 Token 失效
    await testRevokedTokenInvalid(token2);

    // 6. 验证第一个设备仍然有效
    await testOtherSessionStillValid(token1);

    // 7. 测试撤销不存在的会话
    await testRevokeNonExistentSession(token1);

    logger.info('所有测试通过！');
  } catch (error) {
    logger.error('测试失败', { error });
    process.exitCode = 1;
  } finally {
    // 清理测试数据
    if (validToken) {
      await cleanup(validToken);
    }
  }
}

// 运行测试
main();
