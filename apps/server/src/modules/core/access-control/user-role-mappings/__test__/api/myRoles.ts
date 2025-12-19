/**
 * 获取当前用户角色 API 测试
 *
 * 测试流程：
 * 1. 使用已初始化的系统管理员登录获取 Token
 * 2. 调用 myRoles API 获取当前用户的角色
 * 3. 验证返回结果
 *
 * 运行: bun run src/modules/core/access-control/user-role-mappings/__test__/api/myRoles.ts
 */

import { env } from '@/common/env';
import { createClient, type Client } from '@client/index';
import { createLogger } from '@rapid-s/logger';

// ========== Logger 实例 ==========
const logger = createLogger({
  namespace: 'Test:UserRoleMappings:MyRoles',
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

/** 测试获取当前用户的角色 */
async function testGetMyRoles(client: Client) {
  logger.info('测试获取当前用户的角色...');

  const mappingsApi = getMappingsApi(client);
  const roles = await mappingsApi.myRoles.query();

  // 注意：myRoles 返回的是 userRoleMappings 表记录，包含映射信息
  logger.info('获取当前用户角色映射成功', {
    mappingCount: roles.length,
    mappings: roles.map(mapping => ({
      id: mapping.id,
      roleId: mapping.roleId,
      isRevoked: mapping.isRevoked,
      effectiveFrom: mapping.effectiveFrom,
      effectiveTo: mapping.effectiveTo,
    })),
  });

  return roles;
}

// ========== 主测试流程 ==========

async function main() {
  logger.info('开始获取当前用户角色 API 测试', { apiUrl: API_URL });

  const client = createClient(API_URL);

  try {
    // 1. 管理员登录
    const accessToken = await adminLogin(client);
    logger.info('管理员登录成功');

    // 2. 创建带认证的客户端
    const authedClient = createClient(API_URL, {
      token: accessToken,
    });

    // 3. 获取当前用户的角色
    await testGetMyRoles(authedClient);

    logger.info('测试通过！');
  } catch (error) {
    logger.error('测试失败', { error });
    process.exitCode = 1;
  }
}

// 运行测试
main();
