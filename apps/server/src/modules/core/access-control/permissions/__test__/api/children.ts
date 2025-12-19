/**
 * 获取子权限列表 API 测试
 *
 * 测试流程：
 * 1. 使用已初始化的系统管理员登录获取 Token
 * 2. 先获取顶级权限，取第一个作为父权限
 * 3. 调用 children API 获取子权限列表
 * 4. 验证返回结果
 *
 * 运行: bun run src/modules/core/access-control/permissions/__test__/api/children.ts
 */

import { env } from '@/common/env';
import { createClient, type Client } from '@client/index';
import { createLogger } from '@rapid-s/logger';

// ========== Logger 实例 ==========
const logger = createLogger({
  namespace: 'Test:Permissions:Children',
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

/** 测试获取子权限列表 */
async function testGetChildPermissions(client: Client) {
  logger.info('测试获取子权限列表...');

  const permissionsApi = getPermissionsApi(client);

  // 先获取顶级权限作为父权限
  const rootPermissions = await permissionsApi.roots.query();
  const parentPermission = rootPermissions.at(0);
  if (!parentPermission) {
    logger.warn('系统中没有顶级权限，跳过子权限测试');
    return [];
  }
  logger.info('父权限', {
    id: parentPermission.id,
    code: parentPermission.code,
    name: parentPermission.name,
  });

  // 获取子权限列表
  const children = await permissionsApi.children.query({
    parentId: parentPermission.id,
  });

  // 验证所有返回的权限的 parentId 都等于指定的父权限 ID
  const hasInvalidChild = children.some(
    c => c.parentId !== parentPermission.id
  );
  if (hasInvalidChild) {
    throw new Error('返回结果中包含非该父权限的子权限');
  }

  logger.info('获取子权限列表成功', {
    parentId: parentPermission.id,
    count: children.length,
    children: children.map(c => ({
      id: c.id,
      code: c.code,
      name: c.name,
    })),
  });

  return children;
}

// ========== 主测试流程 ==========

async function main() {
  logger.info('开始获取子权限列表 API 测试', { apiUrl: API_URL });

  const client = createClient(API_URL);

  try {
    // 1. 管理员登录
    const accessToken = await adminLogin(client);
    logger.info('管理员登录成功');

    // 2. 创建带认证的客户端
    const authedClient = createClient(API_URL, {
      token: accessToken,
    });

    // 3. 测试获取子权限列表
    await testGetChildPermissions(authedClient);

    logger.info('测试通过！');
  } catch (error) {
    logger.error('测试失败', { error });
    process.exitCode = 1;
  }
}

// 运行测试
main();
