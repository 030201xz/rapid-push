/**
 * 删除角色 API 测试
 *
 * 测试流程：
 * 1. 使用已初始化的系统管理员登录获取 Token
 * 2. 先创建一个测试角色
 * 3. 调用 delete API 删除角色
 * 4. 验证删除成功（查询应返回 null 或软删除状态）
 *
 * 运行: bun run src/modules/core/access-control/roles/__test__/api/delete.ts
 */

import { env } from '@/common/env';
import { createClient, type Client } from '@client/index';
import { createLogger } from '@rapid-s/logger';

// ========== Logger 实例 ==========
const logger = createLogger({ namespace: 'Test:Roles:Delete' });

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
  name: '待删除的测试角色',
  description: '这是一个将被删除的测试角色',
  level: 10,
  isSystem: false, // 非系统角色才能删除
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

/** 创建测试角色 */
async function createTestRole(client: Client) {
  logger.info('创建测试角色...');

  const rolesApi = getRolesApi(client);
  const role = await rolesApi.create.mutate(NEW_ROLE);

  logger.info('测试角色创建成功', {
    id: role.id,
    code: role.code,
  });

  return role;
}

/** 测试删除角色 */
async function testDeleteRole(client: Client, roleId: string) {
  logger.info('测试删除角色...', { roleId });

  const rolesApi = getRolesApi(client);
  await rolesApi.delete.mutate({ id: roleId });

  logger.info('角色删除成功', { roleId });
}

/** 验证删除结果 */
async function verifyDeletion(client: Client, roleId: string) {
  logger.info('验证删除结果...');

  const rolesApi = getRolesApi(client);
  const role = await rolesApi.byId.query({ id: roleId });

  // 根据实现方式验证：硬删除返回 null，软删除返回 isDeleted: true
  if (role === null) {
    logger.info('验证成功：角色已被硬删除');
  } else if (role.isDeleted) {
    logger.info('验证成功：角色已被软删除', {
      id: role.id,
      isDeleted: role.isDeleted,
    });
  } else {
    throw new Error('删除验证失败：角色仍然存在且未被标记为删除');
  }
}

// ========== 主测试流程 ==========

async function main() {
  logger.info('开始删除角色 API 测试', { apiUrl: API_URL });

  const client = createClient(API_URL);

  try {
    // 1. 管理员登录
    const accessToken = await adminLogin(client);
    logger.info('管理员登录成功');

    // 2. 创建带认证的客户端
    const authedClient = createClient(API_URL, {
      token: accessToken,
    });

    // 3. 创建测试角色
    const testRole = await createTestRole(authedClient);

    // 4. 删除角色
    await testDeleteRole(authedClient, testRole.id);

    // 5. 验证删除结果
    await verifyDeletion(authedClient, testRole.id);

    logger.info('测试通过！');
  } catch (error) {
    logger.error('测试失败', { error });
    process.exitCode = 1;
  }
}

// 运行测试
main();
