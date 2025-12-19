/**
 * 权限列表 API 测试
 *
 * 测试流程：
 * 1. 使用已初始化的系统管理员登录获取 Token
 * 2. 调用 list API 获取所有权限
 * 3. 验证返回结果
 *
 * 运行: bun run src/modules/core/access-control/permissions/__test__/api/list.ts
 */

import { env } from '@/common/env';
import { createClient, type Client } from '@client/index';
import { createLogger } from '@rapid-s/logger';

// ========== Logger 实例 ==========
const logger = createLogger({ namespace: 'Test:Permissions:List' });

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

/** 测试获取权限列表 */
async function testListPermissions(client: Client) {
  logger.info('测试获取权限列表...');

  const permissionsApi = getPermissionsApi(client);
  const permissions = await permissionsApi.list.query();

  logger.info('获取权限列表成功', {
    count: permissions.length,
    sample: permissions.slice(0, 3).map(p => ({
      id: p.id,
      code: p.code,
      name: p.name,
    })),
  });

  return permissions;
}

// ========== 主测试流程 ==========

async function main() {
  logger.info('开始权限列表 API 测试', { apiUrl: API_URL });

  const client = createClient(API_URL);

  try {
    // 1. 管理员登录（公开接口也可以不登录访问，这里演示完整流程）
    const accessToken = await adminLogin(client);
    logger.info('管理员登录成功');

    // 2. 创建带认证的客户端
    const authedClient = createClient(API_URL, {
      token: accessToken,
    });

    // 3. 获取权限列表
    await testListPermissions(authedClient);

    logger.info('测试通过！');
  } catch (error) {
    logger.error('测试失败', { error });
    process.exitCode = 1;
  }
}

// 运行测试
main();
