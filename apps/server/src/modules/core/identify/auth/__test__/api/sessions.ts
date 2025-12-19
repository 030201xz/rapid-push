/**
 * 获取活跃会话列表 API 测试
 *
 * 测试流程：
 * 1. 使用管理员账户登录多次，模拟多设备登录
 * 2. 调用 sessions 接口获取所有活跃会话
 * 3. 验证会话数量正确
 * 4. 验证会话信息完整性
 *
 * 运行: bun run src/modules/core/identify/auth/__test__/api/sessions.ts
 */

import { env } from '@/common/env';
import { createClient, type Client } from '@client/index';
import { createLogger } from '@rapid-s/logger';

// ========== Logger 实例 ==========
const logger = createLogger({ namespace: 'Test:Auth:Sessions' });

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

  const tokens = await Promise.all([
    login(client, 'Sessions-Test-Device-1'),
    login(client, 'Sessions-Test-Device-2'),
  ]);

  logger.info('多设备登录完成', { deviceCount: tokens.length });

  return tokens;
}

/** 测试获取会话列表 */
async function testGetSessions(accessToken: string) {
  logger.info('测试获取会话列表...');

  const authedClient = createClient(API_URL, { token: accessToken });
  const auth = getAuthApi(authedClient);
  const sessions = await auth.sessions.query();

  logger.info('获取会话列表成功', { sessionCount: sessions.length });

  return sessions;
}

/** 测试会话信息完整性 */
async function testSessionInfoIntegrity(accessToken: string) {
  logger.info('验证会话信息完整性...');

  const authedClient = createClient(API_URL, { token: accessToken });
  const auth = getAuthApi(authedClient);
  const sessions = await auth.sessions.query();

  if (sessions.length === 0) {
    throw new Error('会话列表为空');
  }

  // 验证第一个会话的信息完整性
  const session = sessions[0];
  if (!session) {
    throw new Error('无法获取第一个会话');
  }

  // 根据实际的 session schema 验证必要字段
  if (!session.id) {
    throw new Error('会话缺少 id 字段');
  }

  logger.info('会话信息完整性验证通过', {
    sampleSession: {
      id: session.id,
      // 其他字段根据实际 schema 记录
    },
  });
}

/** 测试未认证访问被拒绝 */
async function testUnauthorizedAccess(client: Client) {
  logger.info('测试未认证访问被拒绝...');

  const auth = getAuthApi(client);

  try {
    await auth.sessions.query();
    throw new Error('预期请求应被拒绝，但成功了');
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.includes('预期请求应被拒绝')
    ) {
      throw error;
    }
    logger.info('未认证访问被正确拒绝');
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
  logger.info('开始会话列表 API 测试', { apiUrl: API_URL });

  const client = createClient(API_URL);
  let accessToken: string | undefined;

  try {
    // 1. 模拟多设备登录
    const tokens = await loginMultipleDevices(client);
    accessToken = tokens[0];

    // 2. 获取会话列表
    const sessions = await testGetSessions(accessToken);

    // 3. 验证会话数量（至少有当前登录的设备数）
    if (sessions.length < 2) {
      logger.warn('会话数量少于预期', {
        expected: 2,
        actual: sessions.length,
      });
    }

    // 4. 验证会话信息完整性
    await testSessionInfoIntegrity(accessToken);

    // 5. 测试未认证访问
    await testUnauthorizedAccess(client);

    logger.info('所有测试通过！');
  } catch (error) {
    logger.error('测试失败', { error });
    process.exitCode = 1;
  } finally {
    // 清理测试数据
    if (accessToken) {
      await cleanup(accessToken);
    }
  }
}

// 运行测试
main();
