/**
 * 根据ID获取用户 API 测试
 *
 * 测试流程：
 * 1. 获取用户列表，获取一个存在的用户ID
 * 2. 根据ID查询用户
 * 3. 测试不存在的ID返回null
 *
 * 运行: bun run src/modules/core/identify/users/__test__/api/byId.ts
 */

import { env } from '@/common/env';
import { createClient } from '@client/index';
import { createLogger } from '@rapid-s/logger';

// ========== Logger 实例 ==========
const logger = createLogger({ namespace: 'Test:UserById' });

// ========== 测试配置 ==========
const API_URL = `http://${env.host}:${env.port}/trpc`;

// ========== 测试用例 ==========

/** 测试根据ID获取用户（公开接口） */
async function testGetUserById() {
  logger.info('测试根据ID获取用户...');

  const client = createClient(API_URL);
  const usersApi = client.core.identify.users;

  // 先获取用户列表，拿到一个存在的用户ID
  const userList = await usersApi.list.query();
  if (userList.length === 0) {
    throw new Error('没有可用的测试用户，请先初始化数据');
  }

  const targetUser = userList[0];
  if (!targetUser) {
    throw new Error('用户列表为空');
  }
  logger.info('使用测试用户', {
    id: targetUser.id,
    username: targetUser.username,
  });

  // 根据ID查询用户
  const user = await usersApi.byId.query({ id: targetUser.id });

  if (!user) {
    throw new Error(`用户 ${targetUser.id} 不存在`);
  }

  logger.info('根据ID获取用户成功', {
    id: user.id,
    username: user.username,
    email: user.email,
    status: user.status,
  });

  // 验证返回的用户ID匹配（targetUser 已在上方验证非空）
  if (user.id !== targetUser!.id) {
    throw new Error('返回的用户ID不匹配');
  }

  return user;
}

/** 测试不存在的用户ID返回null */
async function testGetNonExistentUser() {
  logger.info('测试查询不存在的用户...');

  const client = createClient(API_URL);
  const usersApi = client.core.identify.users;

  // 使用一个不存在的UUID
  const fakeId = '00000000-0000-0000-0000-000000000000';
  const user = await usersApi.byId.query({ id: fakeId });

  if (user !== null) {
    throw new Error('查询不存在的用户应返回null');
  }

  logger.info('查询不存在的用户正确返回null');
}

// ========== 主测试流程 ==========

async function main() {
  logger.info('开始根据ID获取用户 API 测试', { apiUrl: API_URL });

  try {
    await testGetUserById();
    await testGetNonExistentUser();
    logger.info('所有测试通过！');
  } catch (error) {
    logger.error('测试失败', { error });
    process.exitCode = 1;
  }
}

// 运行测试
main();
