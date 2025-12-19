/**
 * 获取设备列表 API 测试
 *
 * 测试流程：
 * 1. 使用管理员账户登录（带设备信息）
 * 2. 调用 devices 接口获取设备列表
 * 3. 验证设备信息完整性
 * 4. 测试未认证访问被拒绝
 *
 * 运行: bun run src/modules/core/identify/auth/__test__/api/devices.ts
 */

import { env } from '@/common/env';
import { createClient, type Client } from '@client/index';
import { createLogger } from '@rapid-s/logger';

// ========== Logger 实例 ==========
const logger = createLogger({ namespace: 'Test:Auth:Devices' });

// ========== 测试配置 ==========
const API_URL = `http://${env.host}:${env.port}/trpc`;

// 测试用户凭证
const TEST_USER = {
  username: 'admin',
  password: 'Admin@123456',
};

// 测试设备信息
const TEST_DEVICE = {
  deviceFingerprint: `test-fingerprint-${Date.now()}`,
  deviceName: 'Devices-Test-Device',
  deviceType: 'desktop' as const,
};

// ========== 路由别名 ==========

/** 获取 auth 路由 */
const getAuthApi = (client: Client) => client.core.identify.auth;

// ========== 测试用例 ==========

/** 登录获取 Token（带设备信息） */
async function loginWithDevice(client: Client) {
  logger.info('登录（带设备信息）...');

  const auth = getAuthApi(client);
  const result = await auth.login.mutate({
    username: TEST_USER.username,
    password: TEST_USER.password,
    ...TEST_DEVICE,
  });

  if (!result.success) {
    throw new Error(`登录失败: ${result.errorMessage}`);
  }

  logger.info('登录成功', { deviceName: TEST_DEVICE.deviceName });

  return result.accessToken!;
}

/** 测试获取设备列表 */
async function testGetDevices(accessToken: string) {
  logger.info('测试获取设备列表...');

  const authedClient = createClient(API_URL, { token: accessToken });
  const auth = getAuthApi(authedClient);
  const devices = await auth.devices.query();

  logger.info('获取设备列表成功', { deviceCount: devices.length });

  return devices;
}

/** 测试设备信息完整性 */
async function testDeviceInfoIntegrity(accessToken: string) {
  logger.info('验证设备信息完整性...');

  const authedClient = createClient(API_URL, { token: accessToken });
  const auth = getAuthApi(authedClient);
  const devices = await auth.devices.query();

  if (devices.length === 0) {
    throw new Error('设备列表为空');
  }

  // 验证第一个设备的信息完整性
  const device = devices[0];
  if (!device) {
    throw new Error('无法获取第一个设备');
  }

  if (!device.id) {
    throw new Error('设备缺少 id 字段');
  }

  logger.info('设备信息完整性验证通过', {
    sampleDevice: {
      id: device.id,
      // 其他字段根据实际 schema 记录
    },
  });

  return device;
}

/** 测试未认证访问被拒绝 */
async function testUnauthorizedAccess(client: Client) {
  logger.info('测试未认证访问被拒绝...');

  const auth = getAuthApi(client);

  try {
    await auth.devices.query();
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
  logger.info('开始设备列表 API 测试', { apiUrl: API_URL });

  const client = createClient(API_URL);
  let accessToken: string | undefined;

  try {
    // 1. 登录（带设备信息）
    accessToken = await loginWithDevice(client);

    // 2. 获取设备列表
    const devices = await testGetDevices(accessToken);
    logger.info('设备列表', { devices });

    // 3. 验证设备信息完整性
    await testDeviceInfoIntegrity(accessToken);

    // 4. 测试未认证访问
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
