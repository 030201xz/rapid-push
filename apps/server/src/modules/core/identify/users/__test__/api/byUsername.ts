/**
 * 根据用户名获取用户 API 测试
 *
 * 测试流程：
 * 1. 使用已初始化的管理员用户名查询
 * 2. 测试不存在的用户名返回null
 *
 * 运行: bun run src/modules/core/identify/users/__test__/api/byUsername.ts
 */

import { env } from '@/common/env';
import { createClient } from '@client/index';
import { createLogger } from '@rapid-s/logger';

// ========== Logger 实例 ==========
const logger = createLogger({ namespace: 'Test:UserByUsername' });

// ========== 测试配置 ==========
const API_URL = `http://${env.host}:${env.port}/trpc`;

// 已初始化的系统管理员用户名
const ADMIN_USERNAME = 'admin';

// ========== 测试用例 ==========

/** 测试根据用户名获取用户（公开接口） */
async function testGetUserByUsername() {
  logger.info('测试根据用户名获取用户...', {
    username: ADMIN_USERNAME,
  });

  const client = createClient(API_URL);
  const usersApi = client.core.identify.users;

  // 根据用户名查询用户
  const user = await usersApi.byUsername.query({
    username: ADMIN_USERNAME,
  });

  if (!user) {
    throw new Error(`用户 ${ADMIN_USERNAME} 不存在`);
  }

  logger.info('根据用户名获取用户成功', {
    id: user.id,
    username: user.username,
    email: user.email,
    status: user.status,
  });

  // 验证返回的用户名匹配
  if (user.username !== ADMIN_USERNAME) {
    throw new Error('返回的用户名不匹配');
  }

  return user;
}

/** 测试不存在的用户名返回null */
async function testGetNonExistentUsername() {
  logger.info('测试查询不存在的用户名...');

  const client = createClient(API_URL);
  const usersApi = client.core.identify.users;

  // 使用一个不存在的用户名
  const fakeUsername = `nonexistent_user_${Date.now()}`;
  const user = await usersApi.byUsername.query({
    username: fakeUsername,
  });

  if (user !== null) {
    throw new Error('查询不存在的用户名应返回null');
  }

  logger.info('查询不存在的用户名正确返回null');
}

// ========== 主测试流程 ==========

async function main() {
  logger.info('开始根据用户名获取用户 API 测试', { apiUrl: API_URL });

  try {
    await testGetUserByUsername();
    await testGetNonExistentUsername();
    logger.info('所有测试通过！');
  } catch (error) {
    logger.error('测试失败', { error });
    process.exitCode = 1;
  }
}

// 运行测试
main();
