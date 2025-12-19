/**
 * 取消设备信任 API 测试
 *
 * 测试流程：
 * 1. 使用管理员账户登录（带设备信息）
 * 2. 获取设备列表找到当前设备
 * 3. 先设置设备为可信
 * 4. 调用 untrustDevice 取消设备信任
 * 5. 验证设备状态变更
 *
 * 运行: bun run src/modules/core/identify/auth/__test__/api/untrustDevice.ts
 */

import { env } from '@/common/env';
import { createClient, type Client } from '@client/index';
import { createLogger } from '@rapid-s/logger';

// ========== Logger 实例 ==========
const logger = createLogger({
  namespace: 'Test:Auth:UntrustDevice',
});

// ========== 测试配置 ==========
const API_URL = `http://${env.host}:${env.port}/trpc`;

// 测试用户凭证
const TEST_USER = {
  username: 'admin',
  password: 'Admin@123456',
};

// 测试设备信息
const TEST_DEVICE = {
  deviceFingerprint: `untrust-test-${Date.now()}`,
  deviceName: 'UntrustDevice-Test',
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

/** 设置设备为可信（准备测试数据） */
async function setupTrustedDevice(
  accessToken: string,
  deviceId: string
) {
  logger.info('设置设备为可信（准备测试数据）...');

  const authedClient = createClient(API_URL, { token: accessToken });
  const auth = getAuthApi(authedClient);
  await auth.trustDevice.mutate({ deviceId });

  logger.info('设备已设置为可信');
}

/** 测试取消设备信任 */
async function testUntrustDevice(
  accessToken: string,
  deviceId: string
) {
  logger.info('测试取消设备信任...', { deviceId });

  const authedClient = createClient(API_URL, { token: accessToken });
  const auth = getAuthApi(authedClient);
  const result = await auth.untrustDevice.mutate({ deviceId });

  if (!result.success) {
    const message = 'message' in result ? result.message : '未知错误';
    throw new Error(`取消设备信任失败: ${message}`);
  }

  logger.info('取消设备信任成功', {
    deviceId,
    device: 'device' in result ? result.device : null,
  });

  return result;
}

/** 验证设备状态已变更为不可信 */
async function verifyDeviceUntrusted(
  accessToken: string,
  deviceId: string
) {
  logger.info('验证设备状态已变更为不可信...');

  const devices = await getDevices(accessToken);
  const device = devices.find(d => d.id === deviceId);

  if (!device) {
    throw new Error('设备不存在');
  }

  // 根据实际的 device schema 检查 isTrusted 字段
  if ('isTrusted' in device && device.isTrusted) {
    throw new Error('设备状态未变更为不可信');
  }

  logger.info('设备状态验证通过');
}

/** 测试取消不存在的设备的信任 */
async function testUntrustNonExistentDevice(accessToken: string) {
  logger.info('测试取消不存在的设备的信任...');

  const authedClient = createClient(API_URL, { token: accessToken });
  const auth = getAuthApi(authedClient);

  const fakeDeviceId = '00000000-0000-0000-0000-000000000000';
  const result = await auth.untrustDevice.mutate({
    deviceId: fakeDeviceId,
  });

  if (result.success) {
    logger.warn('取消不存在的设备的信任意外成功');
  } else {
    const message = 'message' in result ? result.message : '未知错误';
    logger.info('取消不存在的设备的信任被正确拒绝', {
      message,
    });
  }
}

/** 测试重复取消设备信任 */
async function testUntrustAlreadyUntrustedDevice(
  accessToken: string,
  deviceId: string
) {
  logger.info('测试重复取消设备信任...');

  const authedClient = createClient(API_URL, { token: accessToken });
  const auth = getAuthApi(authedClient);
  const result = await auth.untrustDevice.mutate({ deviceId });

  // 重复取消应该是幂等操作
  if (result.success) {
    logger.info('重复取消设备信任成功（幂等操作）');
  } else {
    const message = 'message' in result ? result.message : '未知错误';
    logger.info('重复取消设备信任被拒绝', {
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
  logger.info('开始取消设备信任 API 测试', { apiUrl: API_URL });

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

    // 3. 先设置设备为可信
    await setupTrustedDevice(accessToken, targetDevice.id);

    // 4. 取消设备信任
    await testUntrustDevice(accessToken, targetDevice.id);

    // 5. 验证设备状态变更
    await verifyDeviceUntrusted(accessToken, targetDevice.id);

    // 6. 测试重复取消
    await testUntrustAlreadyUntrustedDevice(
      accessToken,
      targetDevice.id
    );

    // 7. 测试取消不存在的设备
    await testUntrustNonExistentDevice(accessToken);

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
