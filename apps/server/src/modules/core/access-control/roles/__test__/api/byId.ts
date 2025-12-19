/**
 * 根据 ID 获取角色 API 测试
 *
 * 测试流程：
 * 1. 使用已初始化的系统管理员登录获取 Token
 * 2. 先获取角色列表，取第一个角色的 ID
 * 3. 调用 byId API 根据 ID 获取角色
 * 4. 验证返回结果
 *
 * 运行: bun run src/modules/core/access-control/roles/__test__/api/byId.ts
 */

import { env } from '@/common/env';
import { createClient, type Client } from '@client/index';
import { createLogger } from '@rapid-s/logger';

// ========== Logger 实例 ==========
const logger = createLogger({ namespace: 'Test:Roles:ById' });

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

/** 测试根据 ID 获取角色 */
async function testGetRoleById(client: Client) {
  logger.info('测试根据 ID 获取角色...');

  const rolesApi = getRolesApi(client);

  // 先获取角色列表
  const roles = await rolesApi.list.query();
  const targetRole = roles.at(0);
  if (!targetRole) {
    throw new Error('系统中没有角色数据，请先创建角色');
  }
  logger.info('目标角色', {
    id: targetRole.id,
    code: targetRole.code,
  });

  // 根据 ID 获取角色
  const role = await rolesApi.byId.query({ id: targetRole.id });

  if (!role) {
    throw new Error(`未找到角色 ID: ${targetRole.id}`);
  }

  // 验证返回结果
  if (role.id !== targetRole.id) {
    throw new Error('返回的角色 ID 不匹配');
  }

  logger.info('获取角色成功', {
    id: role.id,
    code: role.code,
    name: role.name,
    level: role.level,
  });

  return role;
}

// ========== 主测试流程 ==========

async function main() {
  logger.info('开始根据 ID 获取角色 API 测试', { apiUrl: API_URL });

  const client = createClient(API_URL);

  try {
    // 1. 管理员登录
    const accessToken = await adminLogin(client);
    logger.info('管理员登录成功');

    // 2. 创建带认证的客户端
    const authedClient = createClient(API_URL, {
      token: accessToken,
    });

    // 3. 测试根据 ID 获取角色
    await testGetRoleById(authedClient);

    logger.info('测试通过！');
  } catch (error) {
    logger.error('测试失败', { error });
    process.exitCode = 1;
  }
}

// 运行测试
main();
