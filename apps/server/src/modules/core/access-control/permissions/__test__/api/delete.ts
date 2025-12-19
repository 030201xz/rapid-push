/**
 * 删除权限 API 测试
 *
 * 测试流程：
 * 1. 使用已初始化的系统管理员登录获取 Token
 * 2. 先创建一个测试权限
 * 3. 调用 delete API 删除权限
 * 4. 验证删除成功（查询应返回 null 或软删除状态）
 *
 * 运行: bun run src/modules/core/access-control/permissions/__test__/api/delete.ts
 */

import { env } from '@/common/env';
import { createClient, type Client } from '@client/index';
import { createLogger } from '@rapid-s/logger';

// ========== Logger 实例 ==========
const logger = createLogger({ namespace: 'Test:Permissions:Delete' });

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
  name: '待删除的测试权限',
  description: '这是一个将被删除的测试权限',
  type: 'api' as const,
  resource: '/api/test/delete',
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

/** 测试删除权限 */
async function testDeletePermission(
  client: Client,
  permissionId: string
) {
  logger.info('测试删除权限...', { permissionId });

  const permissionsApi = getPermissionsApi(client);
  await permissionsApi.delete.mutate({ id: permissionId });

  logger.info('权限删除成功', { permissionId });
}

/** 验证删除结果 */
async function verifyDeletion(client: Client, permissionId: string) {
  logger.info('验证删除结果...');

  const permissionsApi = getPermissionsApi(client);
  const permission = await permissionsApi.byId.query({
    id: permissionId,
  });

  // 根据实现方式验证：硬删除返回 null，软删除返回 isDeleted: true
  if (permission === null) {
    logger.info('验证成功：权限已被硬删除');
  } else if (permission.isDeleted) {
    logger.info('验证成功：权限已被软删除', {
      id: permission.id,
      isDeleted: permission.isDeleted,
    });
  } else {
    throw new Error('删除验证失败：权限仍然存在且未被标记为删除');
  }
}

// ========== 主测试流程 ==========

async function main() {
  logger.info('开始删除权限 API 测试', { apiUrl: API_URL });

  const client = createClient(API_URL);

  try {
    // 1. 管理员登录
    const accessToken = await adminLogin(client);
    logger.info('管理员登录成功');

    // 2. 创建带认证的客户端
    const authedClient = createClient(API_URL, {
      token: accessToken,
    });

    // 3. 创建测试权限
    const testPermission = await createTestPermission(authedClient);

    // 4. 删除权限
    await testDeletePermission(authedClient, testPermission.id);

    // 5. 验证删除结果
    await verifyDeletion(authedClient, testPermission.id);

    logger.info('测试通过！');
  } catch (error) {
    logger.error('测试失败', { error });
    process.exitCode = 1;
  }
}

// 运行测试
main();
