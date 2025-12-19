/**
 * 根据 ID 获取权限 API 测试
 *
 * 测试流程：
 * 1. 使用已初始化的系统管理员登录获取 Token
 * 2. 先获取权限列表，取第一个权限的 ID
 * 3. 调用 byId API 根据 ID 获取权限
 * 4. 验证返回结果
 *
 * 运行: bun run src/modules/core/access-control/permissions/__test__/api/byId.ts
 */

import { env } from '@/common/env';
import { createClient, type Client } from '@client/index';
import { createLogger } from '@rapid-s/logger';

// ========== Logger 实例 ==========
const logger = createLogger({ namespace: 'Test:Permissions:ById' });

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

/** 测试根据 ID 获取权限 */
async function testGetPermissionById(client: Client) {
  logger.info('测试根据 ID 获取权限...');

  const permissionsApi = getPermissionsApi(client);

  // 先获取权限列表
  const permissions = await permissionsApi.list.query();
  const targetPermission = permissions.at(0);
  if (!targetPermission) {
    throw new Error('系统中没有权限数据，请先创建权限');
  }
  logger.info('目标权限', {
    id: targetPermission.id,
    code: targetPermission.code,
  });

  // 根据 ID 获取权限
  const permission = await permissionsApi.byId.query({
    id: targetPermission.id,
  });

  if (!permission) {
    throw new Error(`未找到权限 ID: ${targetPermission.id}`);
  }

  // 验证返回结果
  if (permission.id !== targetPermission.id) {
    throw new Error('返回的权限 ID 不匹配');
  }

  logger.info('获取权限成功', {
    id: permission.id,
    code: permission.code,
    name: permission.name,
    type: permission.type,
  });

  return permission;
}

// ========== 主测试流程 ==========

async function main() {
  logger.info('开始根据 ID 获取权限 API 测试', { apiUrl: API_URL });

  const client = createClient(API_URL);

  try {
    // 1. 管理员登录
    const accessToken = await adminLogin(client);
    logger.info('管理员登录成功');

    // 2. 创建带认证的客户端
    const authedClient = createClient(API_URL, {
      token: accessToken,
    });

    // 3. 测试根据 ID 获取权限
    await testGetPermissionById(authedClient);

    logger.info('测试通过！');
  } catch (error) {
    logger.error('测试失败', { error });
    process.exitCode = 1;
  }
}

// 运行测试
main();
