/**
 * 创建权限 API 测试
 *
 * 测试流程：
 * 1. 使用已初始化的系统管理员登录获取 Token
 * 2. 调用 create API 创建新权限
 * 3. 验证创建成功
 * 4. 清理测试数据
 *
 * 运行: bun run src/modules/core/access-control/permissions/__test__/api/create.ts
 */

import { env } from '@/common/env';
import { createClient, type Client } from '@client/index';
import { createLogger } from '@rapid-s/logger';

// ========== Logger 实例 ==========
const logger = createLogger({ namespace: 'Test:Permissions:Create' });

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

/** 测试创建权限 */
async function testCreatePermission(client: Client) {
  logger.info('测试创建权限...');

  const permissionsApi = getPermissionsApi(client);
  const newPermission = await permissionsApi.create.mutate(
    NEW_PERMISSION
  );

  logger.info('权限创建成功', {
    id: newPermission.id,
    code: newPermission.code,
    name: newPermission.name,
    type: newPermission.type,
  });

  return newPermission;
}

/** 测试查询权限（验证创建结果） */
async function testGetPermission(
  client: Client,
  permissionId: string
) {
  logger.info('验证创建结果...');

  const permissionsApi = getPermissionsApi(client);
  const permission = await permissionsApi.byId.query({
    id: permissionId,
  });

  if (!permission) {
    throw new Error(`权限 ${permissionId} 不存在`);
  }

  logger.info('权限查询成功', {
    id: permission.id,
    code: permission.code,
    name: permission.name,
  });

  return permission;
}

/** 删除测试权限（清理测试数据） */
async function testDeletePermission(
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
  logger.info('开始创建权限 API 测试', { apiUrl: API_URL });

  const client = createClient(API_URL);
  let newPermissionId: string | undefined;
  let accessToken: string | undefined;

  try {
    // 1. 管理员登录
    accessToken = await adminLogin(client);
    logger.info('管理员登录成功');

    // 2. 创建带认证的客户端
    const authedClient = createClient(API_URL, {
      token: accessToken,
    });

    // 3. 创建新权限
    const newPermission = await testCreatePermission(authedClient);
    newPermissionId = newPermission.id;

    // 4. 验证创建结果
    await testGetPermission(authedClient, newPermissionId);

    logger.info('测试通过！');
  } catch (error) {
    logger.error('测试失败', { error });
    process.exitCode = 1;
  } finally {
    // 清理测试数据
    if (newPermissionId && accessToken) {
      try {
        const authedClient = createClient(API_URL, {
          token: accessToken,
        });
        await testDeletePermission(authedClient, newPermissionId);
      } catch (cleanupError) {
        logger.warn('清理测试数据失败', { error: cleanupError });
      }
    }
  }
}

// 运行测试
main();
