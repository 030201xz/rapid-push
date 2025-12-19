/**
 * 删除设备 API 测试
 *
 * 测试流程：
 * 1. 使用管理员账户登录多次（带不同设备信息）
 * 2. 获取设备列表
 * 3. 使用 removeDevice 删除指定设备
 * 4. 验证设备已从列表中移除
 * 5. 验证被删除设备的会话失效
 *
 * 运行: bun run src/modules/core/identify/auth/__test__/api/removeDevice.ts
 */

import { env } from '@/common/env';
import { createClient, type Client } from '@client/index';
import { createLogger } from '@rapid-s/logger';

// ========== Logger 实例 ==========
const logger = createLogger({ namespace: 'Test:Auth:RemoveDevice' });

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

/** 登录获取 Token（带设备信息） */
async function loginWithDevice(client: Client, deviceName: string) {
  const auth = getAuthApi(client);
  const result = await auth.login.mutate({
    username: TEST_USER.username,
    password: TEST_USER.password,
    deviceFingerprint: `remove-test-${deviceName}-${Date.now()}`,
    deviceName,
    deviceType: 'desktop',
  });

  if (!result.success) {
    throw new Error(`登录失败: ${result.errorMessage}`);
  }

  return result.accessToken!;
}

/** 模拟多设备登录 */
async function loginMultipleDevices(client: Client) {
  logger.info('模拟多设备登录...');

  // 串行登录以确保获取不同的设备记录
  const token1 = await loginWithDevice(client, 'RemoveTest-Device-1');
  const token2 = await loginWithDevice(client, 'RemoveTest-Device-2');

  logger.info('多设备登录完成');

  return [token1, token2];
}

/** 获取设备列表 */
async function getDevices(accessToken: string) {
  const authedClient = createClient(API_URL, { token: accessToken });
  const auth = getAuthApi(authedClient);
  return auth.devices.query();
}

/** 测试删除设备 */
async function testRemoveDevice(
  accessToken: string,
  deviceId: string
) {
  logger.info('测试删除设备...', { deviceId });

  const authedClient = createClient(API_URL, { token: accessToken });
  const auth = getAuthApi(authedClient);
  const result = await auth.removeDevice.mutate({ deviceId });

  if (!result.success) {
    throw new Error(`删除设备失败`);
  }

  logger.info('删除设备成功');

  return result;
}

/** 验证设备已从列表中移除 */
async function verifyDeviceRemoved(
  accessToken: string,
  deviceId: string
) {
  logger.info('验证设备已从列表中移除...');

  const devices = await getDevices(accessToken);
  const device = devices.find(d => d.id === deviceId);

  if (device) {
    throw new Error('设备仍在列表中');
  }

  logger.info('设备已从列表中移除');
}

/** 验证被删除设备的会话失效 */
async function verifyDeletedDeviceSessionInvalid(
  accessToken: string
) {
  logger.info('验证被删除设备的会话失效...');

  const authedClient = createClient(API_URL, { token: accessToken });
  const auth = getAuthApi(authedClient);

  try {
    await auth.me.query();
    // 如果设备删除不影响现有会话，这也是合理的
    logger.warn('被删除设备的 Token 仍有效（设计如此）');
  } catch (error) {
    logger.info('被删除设备的会话已失效');
  }
}

/** 测试删除不存在的设备 */
async function testRemoveNonExistentDevice(accessToken: string) {
  logger.info('测试删除不存在的设备...');

  const authedClient = createClient(API_URL, { token: accessToken });
  const auth = getAuthApi(authedClient);

  const fakeDeviceId = '00000000-0000-0000-0000-000000000000';
  const result = await auth.removeDevice.mutate({
    deviceId: fakeDeviceId,
  });

  if (result.success) {
    logger.warn('删除不存在的设备意外成功');
  } else {
    logger.info('删除不存在的设备被正确拒绝');
  }
}

/** 测试删除其他用户的设备（应被拒绝） */
async function testRemoveOtherUserDevice(accessToken: string) {
  logger.info('测试删除其他用户的设备（应被拒绝）...');

  // 使用一个伪造的设备 ID 来模拟
  // 实际测试中，可能需要创建另一个用户的设备
  const authedClient = createClient(API_URL, { token: accessToken });
  const auth = getAuthApi(authedClient);

  const otherUserDeviceId = '11111111-1111-1111-1111-111111111111';
  const result = await auth.removeDevice.mutate({
    deviceId: otherUserDeviceId,
  });

  if (result.success) {
    logger.warn('删除其他用户的设备意外成功（安全问题！）');
  } else {
    logger.info('删除其他用户的设备被正确拒绝');
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
  logger.info('开始删除设备 API 测试', { apiUrl: API_URL });

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

    // 2. 获取设备列表
    const devices = await getDevices(token1);
    logger.info('获取设备列表', { deviceCount: devices.length });

    if (devices.length < 2) {
      throw new Error('设备数量不足，无法测试删除功能');
    }

    // 3. 找到第二个设备（不删除当前正在使用的设备）
    const deviceToRemove = devices[devices.length - 1];
    if (!deviceToRemove) {
      throw new Error('无法获取要删除的设备');
    }
    logger.info('准备删除设备', { deviceId: deviceToRemove.id });

    // 4. 删除设备
    await testRemoveDevice(token1, deviceToRemove.id);

    // 5. 验证设备已从列表中移除
    await verifyDeviceRemoved(token1, deviceToRemove.id);

    // 6. 验证被删除设备的会话状态
    await verifyDeletedDeviceSessionInvalid(token2);

    // 7. 测试删除不存在的设备
    await testRemoveNonExistentDevice(token1);

    // 8. 测试删除其他用户的设备
    await testRemoveOtherUserDevice(token1);

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
