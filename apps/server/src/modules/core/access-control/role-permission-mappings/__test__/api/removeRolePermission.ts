/**
 * 移除角色的某个权限 API 测试
 *
 * 测试流程：
 * 1. 使用已初始化的系统管理员登录获取 Token
 * 2. 创建测试角色和测试权限
 * 3. 为角色分配权限
 * 4. 调用 removeRolePermission API 移除角色的某个权限
 * 5. 验证移除成功
 * 6. 清理测试数据
 *
 * 运行: bun run src/modules/core/access-control/role-permission-mappings/__test__/api/removeRolePermission.ts
 */

import { env } from '@/common/env';
import { createClient, type Client } from '@client/index';
import { createLogger } from '@rapid-s/logger';

// ========== Logger 实例 ==========
const logger = createLogger({
  namespace: 'Test:RolePermissionMappings:RemoveRolePermission',
});

// ========== 测试配置 ==========

const API_URL = `http://${env.host}:${env.port}/trpc`;

// 已初始化的系统管理员账户
const ADMIN_USER = {
  username: 'admin',
  password: 'Admin@123456',
};

// 待创建的测试角色
const NEW_ROLE = {
  code: `test_role_rrp_${Date.now()}`,
  name: '测试角色（移除角色权限）',
  description: '用于测试移除角色权限的角色',
  level: 10,
  isSystem: false,
  isActive: true,
};

// 待创建的测试权限
const NEW_PERMISSION = {
  code: `test_permission_rrp_${Date.now()}`,
  name: '测试权限（移除角色权限）',
  description: '用于测试移除角色权限的权限',
  type: 'api' as const,
  resource: '/api/test/rrp',
  sortPriority: 100,
  isActive: true,
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

/** 创建测试角色 */
async function createTestRole(client: Client) {
  const rolesApi = getRolesApi(client);
  const role = await rolesApi.create.mutate(NEW_ROLE);
  logger.info('测试角色创建成功', { id: role.id, code: role.code });
  return role;
}

/** 创建测试权限 */
async function createTestPermission(client: Client) {
  const permissionsApi = getPermissionsApi(client);
  const permission = await permissionsApi.create.mutate(
    NEW_PERMISSION
  );
  logger.info('测试权限创建成功', {
    id: permission.id,
    code: permission.code,
  });
  return permission;
}

/** 为角色分配权限 */
async function assignPermission(
  client: Client,
  roleId: string,
  permissionId: string
) {
  const mappingsApi = getMappingsApi(client);
  const mapping = await mappingsApi.assign.mutate({
    roleId,
    permissionId,
  });
  logger.info('权限分配成功', { mappingId: mapping.id });
  return mapping;
}

/** 测试移除角色的某个权限 */
async function testRemoveRolePermission(
  client: Client,
  roleId: string,
  permissionId: string
) {
  logger.info('测试移除角色的某个权限...', { roleId, permissionId });

  const mappingsApi = getMappingsApi(client);
  await mappingsApi.removeRolePermission.mutate({
    roleId,
    permissionId,
  });

  logger.info('角色权限移除成功', { roleId, permissionId });
}

/** 验证移除结果 */
async function verifyRemoval(
  client: Client,
  roleId: string,
  permissionId: string
) {
  logger.info('验证移除结果...');

  const mappingsApi = getMappingsApi(client);
  const hasPermission = await mappingsApi.hasPermission.query({
    roleId,
    permissionId,
  });

  if (hasPermission) {
    throw new Error('移除验证失败：角色仍然拥有该权限');
  }

  logger.info('移除验证成功');
}

/** 删除测试角色 */
async function deleteTestRole(client: Client, roleId: string) {
  const rolesApi = getRolesApi(client);
  await rolesApi.delete.mutate({ id: roleId });
  logger.info('测试角色删除成功', { roleId });
}

/** 删除测试权限 */
async function deleteTestPermission(
  client: Client,
  permissionId: string
) {
  const permissionsApi = getPermissionsApi(client);
  await permissionsApi.delete.mutate({ id: permissionId });
  logger.info('测试权限删除成功', { permissionId });
}

// ========== 主测试流程 ==========

async function main() {
  logger.info('开始移除角色权限 API 测试', { apiUrl: API_URL });

  const client = createClient(API_URL);
  let testRoleId: string | undefined;
  let testPermissionId: string | undefined;
  let accessToken: string | undefined;

  try {
    // 1. 管理员登录
    accessToken = await adminLogin(client);
    logger.info('管理员登录成功');

    // 2. 创建带认证的客户端
    const authedClient = createClient(API_URL, {
      token: accessToken,
    });

    // 3. 创建测试角色和权限
    const testRole = await createTestRole(authedClient);
    testRoleId = testRole.id;

    const testPermission = await createTestPermission(authedClient);
    testPermissionId = testPermission.id;

    // 4. 为角色分配权限
    await assignPermission(
      authedClient,
      testRoleId,
      testPermissionId
    );

    // 5. 移除角色的某个权限
    await testRemoveRolePermission(
      authedClient,
      testRoleId,
      testPermissionId
    );

    // 6. 验证移除结果
    await verifyRemoval(authedClient, testRoleId, testPermissionId);

    logger.info('测试通过！');
  } catch (error) {
    logger.error('测试失败', { error });
    process.exitCode = 1;
  } finally {
    // 清理测试数据
    if (accessToken) {
      const authedClient = createClient(API_URL, {
        token: accessToken,
      });

      if (testRoleId) {
        try {
          await deleteTestRole(authedClient, testRoleId);
        } catch (e) {
          logger.warn('清理测试角色失败', { error: e });
        }
      }

      if (testPermissionId) {
        try {
          await deleteTestPermission(authedClient, testPermissionId);
        } catch (e) {
          logger.warn('清理测试权限失败', { error: e });
        }
      }
    }
  }
}

// 运行测试
main();
