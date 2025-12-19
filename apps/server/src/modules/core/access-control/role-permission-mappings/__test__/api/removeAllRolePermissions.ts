/**
 * 移除角色的所有权限 API 测试
 *
 * 测试流程：
 * 1. 使用已初始化的系统管理员登录获取 Token
 * 2. 创建测试角色和多个测试权限
 * 3. 批量为角色分配权限
 * 4. 调用 removeAllRolePermissions API 移除角色的所有权限
 * 5. 验证移除成功
 * 6. 清理测试数据
 *
 * 运行: bun run src/modules/core/access-control/role-permission-mappings/__test__/api/removeAllRolePermissions.ts
 */

import { env } from '@/common/env';
import { createClient, type Client } from '@client/index';
import { createLogger } from '@rapid-s/logger';

// ========== Logger 实例 ==========
const logger = createLogger({
  namespace: 'Test:RolePermissionMappings:RemoveAllRolePermissions',
});

// ========== 测试配置 ==========

const API_URL = `http://${env.host}:${env.port}/trpc`;

// 已初始化的系统管理员账户
const ADMIN_USER = {
  username: 'admin',
  password: 'Admin@123456',
};

const timestamp = Date.now();

// 待创建的测试角色
const NEW_ROLE = {
  code: `test_role_removeall_${timestamp}`,
  name: '测试角色（移除所有权限）',
  description: '用于测试移除所有权限的角色',
  level: 10,
  isSystem: false,
  isActive: true,
};

// 待创建的测试权限列表
const NEW_PERMISSIONS = [
  {
    code: `test_permission_removeall_1_${timestamp}`,
    name: '测试权限1',
    description: '用于测试移除所有权限的权限1',
    type: 'api' as const,
    resource: '/api/test/removeall/1',
    sortPriority: 100,
    isActive: true,
  },
  {
    code: `test_permission_removeall_2_${timestamp}`,
    name: '测试权限2',
    description: '用于测试移除所有权限的权限2',
    type: 'api' as const,
    resource: '/api/test/removeall/2',
    sortPriority: 101,
    isActive: true,
  },
];

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

/** 创建测试权限列表 */
async function createTestPermissions(client: Client) {
  const permissionsApi = getPermissionsApi(client);
  const permissions = await Promise.all(
    NEW_PERMISSIONS.map(p => permissionsApi.create.mutate(p))
  );
  logger.info('测试权限创建成功', {
    count: permissions.length,
    ids: permissions.map(p => p.id),
  });
  return permissions;
}

/** 批量为角色分配权限 */
async function assignBatchPermissions(
  client: Client,
  roleId: string,
  permissionIds: string[]
) {
  const mappingsApi = getMappingsApi(client);
  const mappings = await mappingsApi.assignBatch.mutate({
    roleId,
    permissionIds,
  });
  logger.info('批量权限分配成功', {
    roleId,
    count: mappings.length,
  });
  return mappings;
}

/** 测试移除角色的所有权限 */
async function testRemoveAllRolePermissions(
  client: Client,
  roleId: string
) {
  logger.info('测试移除角色的所有权限...', { roleId });

  const mappingsApi = getMappingsApi(client);
  await mappingsApi.removeAllRolePermissions.mutate({ roleId });

  logger.info('角色所有权限移除成功', { roleId });
}

/** 验证移除结果 */
async function verifyRemoval(client: Client, roleId: string) {
  logger.info('验证移除结果...');

  const mappingsApi = getMappingsApi(client);
  const permissions = await mappingsApi.byRole.query({ roleId });

  if (permissions.length > 0) {
    throw new Error(
      `移除验证失败：角色仍然拥有 ${permissions.length} 个权限`
    );
  }

  logger.info('移除验证成功：角色权限为空');
}

/** 删除测试角色 */
async function deleteTestRole(client: Client, roleId: string) {
  const rolesApi = getRolesApi(client);
  await rolesApi.delete.mutate({ id: roleId });
  logger.info('测试角色删除成功', { roleId });
}

/** 删除测试权限 */
async function deleteTestPermissions(
  client: Client,
  permissionIds: string[]
) {
  const permissionsApi = getPermissionsApi(client);
  await Promise.all(
    permissionIds.map(id => permissionsApi.delete.mutate({ id }))
  );
  logger.info('测试权限删除成功', { count: permissionIds.length });
}

// ========== 主测试流程 ==========

async function main() {
  logger.info('开始移除所有角色权限 API 测试', { apiUrl: API_URL });

  const client = createClient(API_URL);
  let testRoleId: string | undefined;
  let testPermissionIds: string[] = [];
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

    const testPermissions = await createTestPermissions(authedClient);
    testPermissionIds = testPermissions.map(p => p.id);

    // 4. 批量为角色分配权限
    await assignBatchPermissions(
      authedClient,
      testRoleId,
      testPermissionIds
    );

    // 5. 移除角色的所有权限
    await testRemoveAllRolePermissions(authedClient, testRoleId);

    // 6. 验证移除结果
    await verifyRemoval(authedClient, testRoleId);

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

      if (testPermissionIds.length > 0) {
        try {
          await deleteTestPermissions(
            authedClient,
            testPermissionIds
          );
        } catch (e) {
          logger.warn('清理测试权限失败', { error: e });
        }
      }
    }
  }
}

// 运行测试
main();
