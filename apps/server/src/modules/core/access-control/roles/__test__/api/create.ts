/**
 * 创建角色 API 测试
 *
 * 测试流程：
 * 1. 使用已初始化的系统管理员登录获取 Token
 * 2. 调用 create API 创建新角色
 * 3. 验证创建成功
 * 4. 清理测试数据
 *
 * 运行: bun run src/modules/core/access-control/roles/__test__/api/create.ts
 */

import { env } from '@/common/env';
import { createClient, type Client } from '@client/index';
import { createLogger } from '@rapid-s/logger';

// ========== Logger 实例 ==========
const logger = createLogger({ namespace: 'Test:Roles:Create' });

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
  description: '这是一个测试角色',
  level: 10,
  isSystem: false,
  isActive: true,
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

/** 测试创建角色 */
async function testCreateRole(client: Client) {
  logger.info('测试创建角色...');

  const rolesApi = getRolesApi(client);
  const newRole = await rolesApi.create.mutate(NEW_ROLE);

  logger.info('角色创建成功', {
    id: newRole.id,
    code: newRole.code,
    name: newRole.name,
    level: newRole.level,
  });

  return newRole;
}

/** 测试查询角色（验证创建结果） */
async function testGetRole(client: Client, roleId: string) {
  logger.info('验证创建结果...');

  const rolesApi = getRolesApi(client);
  const role = await rolesApi.byId.query({ id: roleId });

  if (!role) {
    throw new Error(`角色 ${roleId} 不存在`);
  }

  logger.info('角色查询成功', {
    id: role.id,
    code: role.code,
    name: role.name,
  });

  return role;
}

/** 删除测试角色（清理测试数据） */
async function testDeleteRole(client: Client, roleId: string) {
  logger.info('删除测试角色...', { roleId });

  const rolesApi = getRolesApi(client);
  await rolesApi.delete.mutate({ id: roleId });

  logger.info('角色删除成功', { roleId });
}

// ========== 主测试流程 ==========

async function main() {
  logger.info('开始创建角色 API 测试', { apiUrl: API_URL });

  const client = createClient(API_URL);
  let newRoleId: string | undefined;
  let accessToken: string | undefined;

  try {
    // 1. 管理员登录
    accessToken = await adminLogin(client);
    logger.info('管理员登录成功');

    // 2. 创建带认证的客户端
    const authedClient = createClient(API_URL, {
      token: accessToken,
    });

    // 3. 创建新角色
    const newRole = await testCreateRole(authedClient);
    newRoleId = newRole.id;

    // 4. 验证创建结果
    await testGetRole(authedClient, newRoleId);

    logger.info('测试通过！');
  } catch (error) {
    logger.error('测试失败', { error });
    process.exitCode = 1;
  } finally {
    // 清理测试数据
    if (newRoleId && accessToken) {
      try {
        const authedClient = createClient(API_URL, {
          token: accessToken,
        });
        await testDeleteRole(authedClient, newRoleId);
      } catch (cleanupError) {
        logger.warn('清理测试数据失败', { error: cleanupError });
      }
    }
  }
}

// 运行测试
main();
