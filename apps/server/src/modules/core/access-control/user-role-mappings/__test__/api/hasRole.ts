/**
 * 检查当前用户是否拥有某角色 API 测试
 *
 * 测试流程：
 * 1. 使用已初始化的系统管理员登录获取 Token
 * 2. 获取角色列表
 * 3. 调用 hasRole API 检查当前用户是否拥有某角色
 * 4. 验证返回结果
 *
 * 运行: bun run src/modules/core/access-control/user-role-mappings/__test__/api/hasRole.ts
 */

import { env } from '@/common/env';
import { createClient, type Client } from '@client/index';
import { createLogger } from '@rapid-s/logger';

// ========== Logger 实例 ==========
const logger = createLogger({
  namespace: 'Test:UserRoleMappings:HasRole',
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
const getRolesApi = (client: Client) =>
  client.core.accessControl.roles;
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

/** 测试检查当前用户是否拥有某角色 */
async function testHasRole(client: Client) {
  logger.info('测试检查当前用户是否拥有某角色...');

  const rolesApi = getRolesApi(client);
  const mappingsApi = getMappingsApi(client);

  // 获取角色列表
  const roles = await rolesApi.list.query();
  if (roles.length === 0) {
    throw new Error('系统中没有角色数据，请先创建角色');
  }

  const targetRole = roles[0];

  // 类型收窄：确保目标角色存在
  if (!targetRole) {
    throw new Error('获取目标角色失败');
  }

  logger.info('目标角色', {
    id: targetRole.id,
    code: targetRole.code,
    name: targetRole.name,
  });

  // 检查当前用户是否拥有该角色
  const hasRole = await mappingsApi.hasRole.query({
    roleId: targetRole.id,
  });

  logger.info('角色检查结果', {
    roleId: targetRole.id,
    roleCode: targetRole.code,
    hasRole,
  });

  return hasRole;
}

// ========== 主测试流程 ==========

async function main() {
  logger.info('开始角色检查 API 测试', { apiUrl: API_URL });

  const client = createClient(API_URL);

  try {
    // 1. 管理员登录
    const accessToken = await adminLogin(client);
    logger.info('管理员登录成功');

    // 2. 创建带认证的客户端
    const authedClient = createClient(API_URL, {
      token: accessToken,
    });

    // 3. 测试角色检查
    await testHasRole(authedClient);

    logger.info('测试通过！');
  } catch (error) {
    logger.error('测试失败', { error });
    process.exitCode = 1;
  }
}

// 运行测试
main();
