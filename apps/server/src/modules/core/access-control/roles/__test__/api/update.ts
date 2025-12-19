/**
 * 更新角色 API 测试
 *
 * 测试流程：
 * 1. 使用已初始化的系统管理员登录获取 Token
 * 2. 先创建一个测试角色
 * 3. 调用 update API 更新角色
 * 4. 验证更新成功
 * 5. 清理测试数据
 *
 * 运行: bun run src/modules/core/access-control/roles/__test__/api/update.ts
 */

import { env } from '@/common/env';
import { createClient, type Client } from '@client/index';
import { createLogger } from '@rapid-s/logger';

// ========== Logger 实例 ==========
const logger = createLogger({ namespace: 'Test:Roles:Update' });

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

// 更新数据
const UPDATE_DATA = {
  name: '更新后的测试角色',
  description: '这是更新后的描述',
  level: 20,
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

/** 测试更新角色 */
async function testUpdateRole(client: Client, roleId: string) {
  logger.info('测试更新角色...');

  const rolesApi = getRolesApi(client);
  const updatedRole = await rolesApi.update.mutate({
    id: roleId,
    ...UPDATE_DATA,
  });

  // 验证更新结果
  if (!updatedRole) {
    throw new Error('更新角色失败：返回为空');
  }
  if (updatedRole.name !== UPDATE_DATA.name) {
    throw new Error('角色名称更新失败');
  }
  if (updatedRole.description !== UPDATE_DATA.description) {
    throw new Error('角色描述更新失败');
  }
  if (updatedRole.level !== UPDATE_DATA.level) {
    throw new Error('角色层级更新失败');
  }

  logger.info('角色更新成功', {
    id: updatedRole.id,
    name: updatedRole.name,
    description: updatedRole.description,
    level: updatedRole.level,
  });

  return updatedRole;
}

/** 删除测试角色（清理测试数据） */
async function deleteTestRole(client: Client, roleId: string) {
  logger.info('删除测试角色...', { roleId });

  const rolesApi = getRolesApi(client);
  await rolesApi.delete.mutate({ id: roleId });

  logger.info('角色删除成功', { roleId });
}

// ========== 主测试流程 ==========

async function main() {
  logger.info('开始更新角色 API 测试', { apiUrl: API_URL });

  const client = createClient(API_URL);
  let testRoleId: string | undefined;
  let accessToken: string | undefined;

  try {
    // 1. 管理员登录
    accessToken = await adminLogin(client);
    logger.info('管理员登录成功');

    // 2. 创建带认证的客户端
    const authedClient = createClient(API_URL, {
      token: accessToken,
    });

    // 3. 创建测试角色
    const testRole = await createTestRole(authedClient);
    testRoleId = testRole.id;

    // 4. 更新角色
    await testUpdateRole(authedClient, testRoleId);

    logger.info('测试通过！');
  } catch (error) {
    logger.error('测试失败', { error });
    process.exitCode = 1;
  } finally {
    // 清理测试数据
    if (testRoleId && accessToken) {
      try {
        const authedClient = createClient(API_URL, {
          token: accessToken,
        });
        await deleteTestRole(authedClient, testRoleId);
      } catch (cleanupError) {
        logger.warn('清理测试数据失败', { error: cleanupError });
      }
    }
  }
}

// 运行测试
main();
