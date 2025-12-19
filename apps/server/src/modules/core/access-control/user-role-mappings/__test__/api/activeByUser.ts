/**
 * 获取用户的有效角色 API 测试
 *
 * 测试流程：
 * 1. 使用已初始化的系统管理员登录获取 Token
 * 2. 获取用户列表，取一个用户的 ID
 * 3. 调用 activeByUser API 获取该用户的有效角色
 * 4. 验证返回结果
 *
 * 运行: bun run src/modules/core/access-control/user-role-mappings/__test__/api/activeByUser.ts
 */

import { env } from '@/common/env';
import { createClient, type Client } from '@client/index';
import { createLogger } from '@rapid-s/logger';

// ========== Logger 实例 ==========
const logger = createLogger({
  namespace: 'Test:UserRoleMappings:ActiveByUser',
});

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
const getMappingsApi = (client: Client) =>
  client.core.accessControl.userRoleMappings;

// ========== 测试辅助函数 ==========

/** 管理员登录 */
async function adminLogin(client: Client) {
  const auth = getAuthApi(client);
  const result = await auth.login.mutate({
    username: ADMIN_USER.username,
    password: ADMIN_USER.password,
  });

  if (!result.success) {
    throw new Error(`管理员登录失败: ${result.errorMessage}`);
  }

  return result.accessToken!;
}

// ========== 测试用例 ==========

/** 测试获取用户的有效角色 */
async function testGetUserActiveRoles(client: Client) {
  logger.info('测试获取用户的有效角色...');

  const usersApi = getUsersApi(client);
  const mappingsApi = getMappingsApi(client);

  // 获取用户列表
  const users = await usersApi.list.query();
  if (users.length === 0) {
    throw new Error('系统中没有用户数据');
  }

  const targetUser = users[0];

  // 类型收窄：确保目标用户存在
  if (!targetUser) {
    throw new Error('获取目标用户失败');
  }

  logger.info('目标用户', {
    id: targetUser.id,
    username: targetUser.username,
  });

  // 获取该用户的有效角色映射（未撤销且在有效期内）
  // 注意：activeByUser 返回的是 userRoleMappings 表记录，包含映射信息
  const activeRoleMappings = await mappingsApi.activeByUser.query({
    userId: targetUser.id,
  });

  logger.info('获取用户有效角色映射成功', {
    userId: targetUser.id,
    mappingCount: activeRoleMappings.length,
    mappings: activeRoleMappings.map(mapping => ({
      id: mapping.id,
      roleId: mapping.roleId,
      isRevoked: mapping.isRevoked,
      effectiveFrom: mapping.effectiveFrom,
      effectiveTo: mapping.effectiveTo,
    })),
  });

  return activeRoleMappings;
}

// ========== 主测试流程 ==========

async function main() {
  logger.info('开始获取用户有效角色 API 测试', { apiUrl: API_URL });

  const client = createClient(API_URL);

  try {
    // 1. 管理员登录
    const accessToken = await adminLogin(client);
    logger.info('管理员登录成功');

    // 2. 创建带认证的客户端
    const authedClient = createClient(API_URL, {
      token: accessToken,
    });

    // 3. 获取用户有效角色
    await testGetUserActiveRoles(authedClient);

    logger.info('测试通过！');
  } catch (error) {
    logger.error('测试失败', { error });
    process.exitCode = 1;
  }
}

// 运行测试
main();
