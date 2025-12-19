/**
 * 为角色分配权限 API 测试
 *
 * 测试流程：
 * 1. 使用已初始化的系统管理员登录获取 Token
 * 2. 创建测试角色和测试权限
 * 3. 调用 assign API 为角色分配权限
 * 4. 验证分配成功
 * 5. 清理测试数据
 *
 * 运行: bun run src/modules/core/access-control/role-permission-mappings/__test__/api/assign.ts
 */

import { env } from '@/common/env';
import { createClient, type Client } from '@client/index';
import { createLogger } from '@rapid-s/logger';

// ========== Logger 实例 ==========
const logger = createLogger({
  namespace: 'Test:RolePermissionMappings:Assign',
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
  code: `test_role_${Date.now()}`,
  name: '测试角色',
  description: '用于测试权限分配的角色',
  level: 10,
  isSystem: false,
  isActive: true,
};

// 待创建的测试权限
const NEW_PERMISSION = {
  code: `test_permission_${Date.now()}`,
  name: '测试权限',
  description: '用于测试权限分配的权限',
  type: 'api' as const,
  resource: '/api/test',
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
  logger.info('创建测试角色...');

  const rolesApi = getRolesApi(client);
  const role = await rolesApi.create.mutate(NEW_ROLE);

  logger.info('测试角色创建成功', { id: role.id, code: role.code });

  return role;
}

/** 创建测试权限 */
async function createTestPermission(client: Client) {
  logger.info('创建测试权限...');

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

/** 测试为角色分配权限 */
async function testAssignPermission(
  client: Client,
  roleId: string,
  permissionId: string
) {
  logger.info('测试为角色分配权限...');

  const mappingsApi = getMappingsApi(client);
  const mapping = await mappingsApi.assign.mutate({
    roleId,
    permissionId,
  });

  logger.info('权限分配成功', {
    mappingId: mapping.id,
    roleId: mapping.roleId,
    permissionId: mapping.permissionId,
  });

  return mapping;
}

/** 验证权限分配结果 */
async function verifyAssignment(
  client: Client,
  roleId: string,
  permissionId: string
) {
  logger.info('验证权限分配结果...');

  const mappingsApi = getMappingsApi(client);
  const hasPermission = await mappingsApi.hasPermission.query({
    roleId,
    permissionId,
  });

  if (!hasPermission) {
    throw new Error('权限分配验证失败：角色没有该权限');
  }

  logger.info('权限分配验证成功');
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
  logger.info('开始权限分配 API 测试', { apiUrl: API_URL });

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
    await testAssignPermission(
      authedClient,
      testRoleId,
      testPermissionId
    );

    // 5. 验证分配结果
    await verifyAssignment(
      authedClient,
      testRoleId,
      testPermissionId
    );

    logger.info('测试通过！');
  } catch (error) {
    logger.error('测试失败', { error });
    process.exitCode = 1;
  } finally {
    // 清理测试数据（映射会随角色/权限删除而级联删除）
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
