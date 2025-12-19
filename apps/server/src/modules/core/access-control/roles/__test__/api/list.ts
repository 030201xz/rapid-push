/**
 * 角色列表 API 测试
 *
 * 测试流程：
 * 1. 使用已初始化的系统管理员登录获取 Token
 * 2. 调用 list API 获取所有角色
 * 3. 验证返回结果
 *
 * 运行: bun run src/modules/core/access-control/roles/__test__/api/list.ts
 */

import { env } from '@/common/env';
import { createClient, type Client } from '@client/index';
import { createLogger } from '@rapid-s/logger';

// ========== Logger 实例 ==========
const logger = createLogger({ namespace: 'Test:Roles:List' });

// ========== 测试配置 ==========

const API_URL = `http://${env.host}:${env.port}/trpc`;

// 已初始化的系统管理员账户
const ADMIN_USER = {
  username: 'admin',
  password: 'Admin@123456',
};

// ========== 路由别名 ==========

const getAuthApi = (client: Client) => client.core.identify.auth;
const getRolesApi = (client: Client) =>
  client.core.accessControl.roles;

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

/** 测试获取角色列表 */
async function testListRoles(client: Client) {
  logger.info('测试获取角色列表...');

  const rolesApi = getRolesApi(client);
  const roles = await rolesApi.list.query();

  logger.info('获取角色列表成功', {
    count: roles.length,
    roles: roles.map(r => ({
      id: r.id,
      code: r.code,
      name: r.name,
      level: r.level,
      isSystem: r.isSystem,
    })),
  });

  return roles;
}

// ========== 主测试流程 ==========

async function main() {
  logger.info('开始角色列表 API 测试', { apiUrl: API_URL });

  const client = createClient(API_URL);

  try {
    // 1. 管理员登录
    const accessToken = await adminLogin(client);
    logger.info('管理员登录成功');

    // 2. 创建带认证的客户端
    const authedClient = createClient(API_URL, {
      token: accessToken,
    });

    // 3. 获取角色列表
    await testListRoles(authedClient);

    logger.info('测试通过！');
  } catch (error) {
    logger.error('测试失败', { error });
    process.exitCode = 1;
  }
}

// 运行测试
main();
