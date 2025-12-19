/**
 * 获取拥有某权限的角色 API 测试
 *
 * 测试流程：
 * 1. 使用已初始化的系统管理员登录获取 Token
 * 2. 获取一个权限的 ID
 * 3. 调用 byPermission API 获取拥有该权限的所有角色
 * 4. 验证返回结果
 *
 * 运行: bun run src/modules/core/access-control/role-permission-mappings/__test__/api/byPermission.ts
 */

import { env } from '@/common/env';
import { createClient, type Client } from '@client/index';
import { createLogger } from '@rapid-s/logger';

// ========== Logger 实例 ==========
const logger = createLogger({
  namespace: 'Test:RolePermissionMappings:ByPermission',
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

/** 测试获取拥有某权限的角色列表 */
async function testGetPermissionRoles(client: Client) {
  logger.info('测试获取拥有某权限的角色列表...');

  const permissionsApi = getPermissionsApi(client);
  const mappingsApi = getMappingsApi(client);

  // 先获取权限列表
  const permissions = await permissionsApi.list.query();
  const targetPermission = permissions.at(0);
  if (!targetPermission) {
    throw new Error('系统中没有权限数据，请先创建权限');
  }

  logger.info('目标权限', {
    id: targetPermission.id,
    code: targetPermission.code,
    name: targetPermission.name,
  });

  // 获取拥有该权限的所有角色映射
  const mappings = await mappingsApi.byPermission.query({
    permissionId: targetPermission.id,
  });

  logger.info('获取权限对应角色映射成功', {
    permissionId: targetPermission.id,
    mappingCount: mappings.length,
    mappings: mappings.map(m => ({
      id: m.id,
      roleId: m.roleId,
    })),
  });

  return mappings;
}

// ========== 主测试流程 ==========

async function main() {
  logger.info('开始获取权限对应角色 API 测试', { apiUrl: API_URL });

  const client = createClient(API_URL);

  try {
    // 1. 管理员登录
    const accessToken = await adminLogin(client);
    logger.info('管理员登录成功');

    // 2. 创建带认证的客户端
    const authedClient = createClient(API_URL, {
      token: accessToken,
    });

    // 3. 测试获取权限对应角色
    await testGetPermissionRoles(authedClient);

    logger.info('测试通过！');
  } catch (error) {
    logger.error('测试失败', { error });
    process.exitCode = 1;
  }
}

// 运行测试
main();
