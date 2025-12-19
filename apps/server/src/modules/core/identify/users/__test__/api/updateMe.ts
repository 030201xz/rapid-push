/**
 * 更新当前用户信息 API 测试
 *
 * 测试流程：
 * 1. 使用管理员登录获取 Token
 * 2. 获取当前用户信息
 * 3. 更新用户昵称
 * 4. 验证更新成功
 * 5. 恢复原始数据
 *
 * 运行: bun run src/modules/core/identify/users/__test__/api/updateMe.ts
 */

import { env } from '@/common/env';
import { createClient, type Client } from '@client/index';
import { createLogger } from '@rapid-s/logger';

// ========== Logger 实例 ==========
const logger = createLogger({ namespace: 'Test:UserUpdateMe' });

// ========== 测试配置 ==========
const API_URL = `http://${env.host}:${env.port}/trpc`;

// 已初始化的系统管理员账户
const ADMIN_USER = {
  username: 'admin',
  password: 'Admin@123456',
};

// ========== 路由别名 ==========
const getAuthApi = (client: Client) => client.core.identify.auth;
const getUsersApi = (client: Client) => client.core.identify.users;

// ========== 测试用例 ==========

/** 管理员登录 */
async function login() {
  logger.info('管理员登录...');

  const client = createClient(API_URL);
  const auth = getAuthApi(client);
  const result = await auth.login.mutate({
    username: ADMIN_USER.username,
    password: ADMIN_USER.password,
  });

  if (!result.success) {
    throw new Error(`管理员登录失败: ${result.errorMessage}`);
  }

  logger.info('管理员登录成功', { user: result.user?.username });

  return result.accessToken!;
}

/** 测试更新当前用户信息 */
async function testUpdateMe(accessToken: string) {
  logger.info('测试更新当前用户信息...');

  const authedClient = createClient(API_URL, { token: accessToken });
  const usersApi = getUsersApi(authedClient);

  // 获取当前用户信息
  const originalUser = await usersApi.me.query();
  if (!originalUser) {
    throw new Error('获取当前用户信息失败');
  }

  const originalNickname = originalUser.nickname;
  const newNickname = `测试昵称_${Date.now()}`;

  logger.info('准备更新昵称', {
    originalNickname,
    newNickname,
  });

  // 更新用户昵称
  const updatedUser = await usersApi.updateMe.mutate({
    nickname: newNickname,
  });

  if (!updatedUser) {
    throw new Error('更新用户信息失败');
  }

  logger.info('用户信息已更新', {
    id: updatedUser.id,
    nickname: updatedUser.nickname,
  });

  // 验证更新成功
  if (updatedUser.nickname !== newNickname) {
    throw new Error('昵称更新失败');
  }

  // 恢复原始昵称
  await usersApi.updateMe.mutate({
    nickname: originalNickname,
  });

  logger.info('已恢复原始昵称');

  return updatedUser;
}

/** 测试更新多个字段 */
async function testUpdateMultipleFields(accessToken: string) {
  logger.info('测试更新多个字段...');

  const authedClient = createClient(API_URL, { token: accessToken });
  const usersApi = getUsersApi(authedClient);

  // 获取当前用户信息
  const originalUser = await usersApi.me.query();
  if (!originalUser) {
    throw new Error('获取当前用户信息失败');
  }

  const testBio = `测试简介_${Date.now()}`;

  // 更新多个字段
  const updatedUser = await usersApi.updateMe.mutate({
    bio: testBio,
  });

  if (!updatedUser) {
    throw new Error('更新用户信息失败');
  }

  logger.info('多字段更新成功', {
    bio: updatedUser.bio,
  });

  // 验证更新成功
  if (updatedUser.bio !== testBio) {
    throw new Error('bio 更新失败');
  }

  // 恢复原始数据
  await usersApi.updateMe.mutate({
    bio: originalUser.bio,
  });

  logger.info('已恢复原始数据');
}

// ========== 主测试流程 ==========

async function main() {
  logger.info('开始更新当前用户信息 API 测试', { apiUrl: API_URL });

  try {
    // 1. 管理员登录
    const accessToken = await login();

    // 2. 测试更新单个字段
    await testUpdateMe(accessToken);

    // 3. 测试更新多个字段
    await testUpdateMultipleFields(accessToken);

    logger.info('所有测试通过！');
  } catch (error) {
    logger.error('测试失败', { error });
    process.exitCode = 1;
  }
}

// 运行测试
main();
