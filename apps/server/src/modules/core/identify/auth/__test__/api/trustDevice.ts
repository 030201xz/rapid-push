/**
 * 设置设备可信 API 测试
 *
 * 测试流程：
 * 1. 使用管理员账户登录（带设备信息）
 * 2. 获取设备列表找到当前设备
 * 3. 调用 trustDevice 设置设备为可信
 * 4. 验证设备状态变更
 * 5. 测试设置不存在的设备为可信
 *
 * 运行: bun run src/modules/core/identify/auth/__test__/api/trustDevice.ts
 */

import { env } from '@/common/env';
import { createClient, type Client } from '@client/index';
import { createLogger } from '@rapid-s/logger';

// ========== Logger 实例 ==========
const logger = createLogger({ namespace: 'Test:Auth:TrustDevice' });

// ========== 测试配置 ==========
const API_URL = `http://${env.host}:${env.port}/trpc`;

// 测试用户凭证
const TEST_USER = {
  username: 'admin',
  password: 'Admin@123456',
};

// 测试设备信息
const TEST_DEVICE = {
  deviceFingerprint: `trust-test-${Date.now()}`,
  deviceName: 'TrustDevice-Test',
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

  logger.info('登录成功');

  return result.accessToken!;
}

/** 获取设备列表 */
async function getDevices(accessToken: string) {
  const authedClient = createClient(API_URL, { token: accessToken });
  const auth = getAuthApi(authedClient);
  return auth.devices.query();
}

/** 测试设置设备为可信 */
async function testTrustDevice(
  accessToken: string,
  deviceId: string
) {
  logger.info('测试设置设备为可信...', { deviceId });

  const authedClient = createClient(API_URL, { token: accessToken });
  const auth = getAuthApi(authedClient);
  const result = await auth.trustDevice.mutate({ deviceId });

  if (!result.success) {
    const message = 'message' in result ? result.message : '未知错误';
    throw new Error(`设置设备可信失败: ${message}`);
  }

  logger.info('设置设备可信成功', {
    deviceId,
    device: 'device' in result ? result.device : null,
  });

  return result;
}

/** 验证设备状态已变更为可信 */
async function verifyDeviceTrusted(
  accessToken: string,
  deviceId: string
) {
  logger.info('验证设备状态已变更为可信...');

  const devices = await getDevices(accessToken);
  const device = devices.find(d => d.id === deviceId);

  if (!device) {
    throw new Error('设备不存在');
  }

  // 根据实际的 device schema 检查 isTrusted 字段
  if ('isTrusted' in device && !device.isTrusted) {
    throw new Error('设备状态未变更为可信');
  }

  logger.info('设备状态验证通过');
}

/** 测试设置不存在的设备为可信 */
async function testTrustNonExistentDevice(accessToken: string) {
  logger.info('测试设置不存在的设备为可信...');

  const authedClient = createClient(API_URL, { token: accessToken });
  const auth = getAuthApi(authedClient);

  const fakeDeviceId = '00000000-0000-0000-0000-000000000000';
  const result = await auth.trustDevice.mutate({
    deviceId: fakeDeviceId,
  });

  if (result.success) {
    logger.warn('设置不存在的设备为可信意外成功');
  } else {
    const message = 'message' in result ? result.message : '未知错误';
    logger.info('设置不存在的设备为可信被正确拒绝', {
      message,
    });
  }
}

/** 测试重复设置设备为可信 */
async function testTrustAlreadyTrustedDevice(
  accessToken: string,
  deviceId: string
) {
  logger.info('测试重复设置设备为可信...');

  const authedClient = createClient(API_URL, { token: accessToken });
  const auth = getAuthApi(authedClient);
  const result = await auth.trustDevice.mutate({ deviceId });

  // 重复设置应该是幂等操作
  if (result.success) {
    logger.info('重复设置设备为可信成功（幂等操作）');
  } else {
    const message = 'message' in result ? result.message : '未知错误';
    logger.info('重复设置设备为可信被拒绝', {
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
  logger.info('开始设置设备可信 API 测试', { apiUrl: API_URL });

  const client = createClient(API_URL);
  let accessToken: string | undefined;

  try {
    // 1. 登录（带设备信息）
    accessToken = await loginWithDevice(client);

    // 2. 获取设备列表
    const devices = await getDevices(accessToken);

    if (devices.length === 0) {
      throw new Error('设备列表为空');
    }

    const targetDevice = devices[0];
    if (!targetDevice) {
      throw new Error('无法获取第一个设备');
    }
    logger.info('获取到设备', { deviceId: targetDevice.id });

    // 3. 设置设备为可信
    await testTrustDevice(accessToken, targetDevice.id);

    // 4. 验证设备状态变更
    await verifyDeviceTrusted(accessToken, targetDevice.id);

    // 5. 测试重复设置
    await testTrustAlreadyTrustedDevice(accessToken, targetDevice.id);

    // 6. 测试设置不存在的设备
    await testTrustNonExistentDevice(accessToken);

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
