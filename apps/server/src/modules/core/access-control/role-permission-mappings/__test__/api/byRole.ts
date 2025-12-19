/**
 * 获取角色权限 API 测试
 *
 * 测试流程：
 * 1. 使用已初始化的系统管理员登录获取 Token
 * 2. 获取一个角色的 ID
 * 3. 调用 byRole API 获取该角色的所有权限
 * 4. 验证返回结果
 *
 * 运行: bun run src/modules/core/access-control/role-permission-mappings/__test__/api/byRole.ts
 */

import { env } from '@/common/env';
import { createClient, type Client } from '@client/index';
import { createLogger } from '@rapid-s/logger';

// ========== Logger 实例 ==========
const logger = createLogger({
  namespace: 'Test:RolePermissionMappings:ByRole',
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
  client.core.accessControl.rolePermissionMappings;

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

/** 测试获取角色的权限列表 */
async function testGetRolePermissions(client: Client) {
  logger.info('测试获取角色的权限列表...');

  const rolesApi = getRolesApi(client);
  const mappingsApi = getMappingsApi(client);

  // 先获取角色列表
  const roles = await rolesApi.list.query();
  const targetRole = roles.at(0);
  if (!targetRole) {
    throw new Error('系统中没有角色数据，请先创建角色');
  }

  logger.info('目标角色', {
    id: targetRole.id,
    code: targetRole.code,
    name: targetRole.name,
  });

  // 获取该角色的所有权限映射
  const mappings = await mappingsApi.byRole.query({
    roleId: targetRole.id,
  });

  logger.info('获取角色权限映射成功', {
    roleId: targetRole.id,
    mappingCount: mappings.length,
    mappings: mappings.slice(0, 5).map(m => ({
      id: m.id,
      permissionId: m.permissionId,
    })),
  });

  return mappings;
}

// ========== 主测试流程 ==========

async function main() {
  logger.info('开始获取角色权限 API 测试', { apiUrl: API_URL });

  const client = createClient(API_URL);

  try {
    // 1. 管理员登录
    const accessToken = await adminLogin(client);
    logger.info('管理员登录成功');

    // 2. 创建带认证的客户端
    const authedClient = createClient(API_URL, {
      token: accessToken,
    });

    // 3. 测试获取角色权限
    await testGetRolePermissions(authedClient);

    logger.info('测试通过！');
  } catch (error) {
    logger.error('测试失败', { error });
    process.exitCode = 1;
  }
}

// 运行测试
main();
