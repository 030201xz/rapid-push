/**
 * 用户列表 API 测试
 *
 * 测试流程：
 * 1. 公开接口测试：无需登录即可获取用户列表
 * 2. 验证返回数据结构
 *
 * 运行: bun run src/modules/core/identify/users/__test__/api/list.ts
 */

import { env } from '@/common/env';
import { createClient } from '@client/index';
import { createLogger } from '@rapid-s/logger';

// ========== Logger 实例 ==========
const logger = createLogger({ namespace: 'Test:UserList' });

// ========== 测试配置 ==========
const API_URL = `http://${env.host}:${env.port}/trpc`;

// ========== 测试用例 ==========

/** 测试获取用户列表（公开接口） */
async function testListUsers() {
  logger.info('测试获取用户列表...');

  const client = createClient(API_URL);
  const userList = await client.core.identify.users.list.query();

  logger.info('获取用户列表成功', {
    count: userList.length,
    users: userList.map(u => ({
      id: u.id,
      username: u.username,
      status: u.status,
    })),
  });

  // 验证返回数据结构
  if (!Array.isArray(userList)) {
    throw new Error('返回数据应为数组');
  }

  if (userList.length > 0) {
    const firstUser = userList[0];
    if (!firstUser?.id || !firstUser?.username) {
      throw new Error('用户对象缺少必要字段');
    }
  }

  return userList;
}

// ========== 主测试流程 ==========

async function main() {
  logger.info('开始用户列表 API 测试', { apiUrl: API_URL });

  try {
    await testListUsers();
    logger.info('所有测试通过！');
  } catch (error) {
    logger.error('测试失败', { error });
    process.exitCode = 1;
  }
}

// 运行测试
main();
