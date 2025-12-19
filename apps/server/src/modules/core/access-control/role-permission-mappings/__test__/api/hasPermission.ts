/**
 * 检查角色是否拥有某权限 API 测试
 *
 * 测试流程：
 * 1. 使用已初始化的系统管理员登录获取 Token
 * 2. 获取一个角色和一个权限的 ID
 * 3. 调用 hasPermission API 检查角色是否拥有该权限
 * 4. 验证返回结果
 *
 * 运行: bun run src/modules/core/access-control/role-permission-mappings/__test__/api/hasPermission.ts
 */

import { env } from '@/common/env';
import { createClient, type Client } from '@client/index';
import { createLogger } from '@rapid-s/logger';

// ========== Logger 实例 ==========
const logger = createLogger({
  namespace: 'Test:RolePermissionMappings:HasPermission',
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
const getPermissionsApi = (client: Client) =>
  client.core.accessControl.permissions;
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

/** 测试检查角色是否拥有某权限 */
async function testHasPermission(client: Client) {
  logger.info('测试检查角色是否拥有某权限...');

  const rolesApi = getRolesApi(client);
  const permissionsApi = getPermissionsApi(client);
  const mappingsApi = getMappingsApi(client);

  // 获取角色列表
  const roles = await rolesApi.list.query();
  if (roles.length === 0) {
    throw new Error('系统中没有角色数据，请先创建角色');
  }

  // 获取权限列表
  const permissions = await permissionsApi.list.query();
  if (permissions.length === 0) {
    throw new Error('系统中没有权限数据，请先创建权限');
  }

  const targetRole = roles[0];
  const targetPermission = permissions[0];

  // 类型收窄：确保目标角色和权限存在
  if (!targetRole || !targetPermission) {
    throw new Error('获取目标角色或权限失败');
  }

  logger.info('目标角色和权限', {
    role: { id: targetRole.id, code: targetRole.code },
    permission: {
      id: targetPermission.id,
      code: targetPermission.code,
    },
  });

  // 检查角色是否拥有该权限
  const hasPermission = await mappingsApi.hasPermission.query({
    roleId: targetRole.id,
    permissionId: targetPermission.id,
  });

  logger.info('权限检查结果', {
    roleId: targetRole.id,
    permissionId: targetPermission.id,
    hasPermission,
  });

  return hasPermission;
}

// ========== 主测试流程 ==========

async function main() {
  logger.info('开始权限检查 API 测试', { apiUrl: API_URL });

  const client = createClient(API_URL);

  try {
    // 1. 管理员登录
    const accessToken = await adminLogin(client);
    logger.info('管理员登录成功');

    // 2. 创建带认证的客户端
    const authedClient = createClient(API_URL, {
      token: accessToken,
    });

    // 3. 测试权限检查
    await testHasPermission(authedClient);

    logger.info('测试通过！');
  } catch (error) {
    logger.error('测试失败', { error });
    process.exitCode = 1;
  }
}

// 运行测试
main();
