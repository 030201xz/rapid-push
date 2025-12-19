/**
 * 更新权限 API 测试
 *
 * 测试流程：
 * 1. 使用已初始化的系统管理员登录获取 Token
 * 2. 先创建一个测试权限
 * 3. 调用 update API 更新权限
 * 4. 验证更新成功
 * 5. 清理测试数据
 *
 * 运行: bun run src/modules/core/access-control/permissions/__test__/api/update.ts
 */

import { env } from '@/common/env';
import { createClient, type Client } from '@client/index';
import { createLogger } from '@rapid-s/logger';

// ========== Logger 实例 ==========
const logger = createLogger({ namespace: 'Test:Permissions:Update' });

// ========== 测试配置 ==========

const API_URL = `http://${env.host}:${env.port}/trpc`;

// 已初始化的系统管理员账户
const ADMIN_USER = {
  username: 'admin',
  password: 'Admin@123456',
};

// 待创建的测试权限
const NEW_PERMISSION = {
  code: `test_permission_${Date.now()}`,
  name: '测试权限',
  description: '这是一个测试权限',
  type: 'api' as const,
  resource: '/api/test',
  sortPriority: 100,
  isActive: true,
};

// 更新数据
const UPDATE_DATA = {
  name: '更新后的测试权限',
  description: '这是更新后的描述',
  sortPriority: 200,
};

// ========== 路由别名 ==========

const getAuthApi = (client: Client) => client.core.identify.auth;
const getPermissionsApi = (client: Client) =>
  client.core.accessControl.permissions;

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

/** 测试更新权限 */
async function testUpdatePermission(
  client: Client,
  permissionId: string
) {
  logger.info('测试更新权限...');

  const permissionsApi = getPermissionsApi(client);
  const updatedPermission = await permissionsApi.update.mutate({
    id: permissionId,
    ...UPDATE_DATA,
  });

  // 验证更新结果
  if (!updatedPermission) {
    throw new Error('更新权限失败：返回为空');
  }
  if (updatedPermission.name !== UPDATE_DATA.name) {
    throw new Error('权限名称更新失败');
  }
  if (updatedPermission.description !== UPDATE_DATA.description) {
    throw new Error('权限描述更新失败');
  }
  if (updatedPermission.sortPriority !== UPDATE_DATA.sortPriority) {
    throw new Error('排序优先级更新失败');
  }

  logger.info('权限更新成功', {
    id: updatedPermission.id,
    name: updatedPermission.name,
    description: updatedPermission.description,
    sortPriority: updatedPermission.sortPriority,
  });

  return updatedPermission;
}

/** 删除测试权限（清理测试数据） */
async function deleteTestPermission(
  client: Client,
  permissionId: string
) {
  logger.info('删除测试权限...', { permissionId });

  const permissionsApi = getPermissionsApi(client);
  await permissionsApi.delete.mutate({ id: permissionId });

  logger.info('权限删除成功', { permissionId });
}

// ========== 主测试流程 ==========

async function main() {
  logger.info('开始更新权限 API 测试', { apiUrl: API_URL });

  const client = createClient(API_URL);
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

    // 3. 创建测试权限
    const testPermission = await createTestPermission(authedClient);
    testPermissionId = testPermission.id;

    // 4. 更新权限
    await testUpdatePermission(authedClient, testPermissionId);

    logger.info('测试通过！');
  } catch (error) {
    logger.error('测试失败', { error });
    process.exitCode = 1;
  } finally {
    // 清理测试数据
    if (testPermissionId && accessToken) {
      try {
        const authedClient = createClient(API_URL, {
          token: accessToken,
        });
        await deleteTestPermission(authedClient, testPermissionId);
      } catch (cleanupError) {
        logger.warn('清理测试数据失败', { error: cleanupError });
      }
    }
  }
}

// 运行测试
main();
