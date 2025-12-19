/**
 * 撤销用户的某个角色 API 测试
 *
 * 测试流程：
 * 1. 使用已初始化的系统管理员登录获取 Token
 * 2. 创建测试用户和测试角色
 * 3. 分配角色给用户
 * 4. 调用 revokeUserRole API 撤销用户的某个角色
 * 5. 验证撤销成功
 * 6. 清理测试数据
 *
 * 运行: bun run src/modules/core/access-control/user-role-mappings/__test__/api/revokeUserRole.ts
 */

import { env } from '@/common/env';
import { createClient, type Client } from '@client/index';
import { createLogger } from '@rapid-s/logger';

// ========== Logger 实例 ==========
const logger = createLogger({
  namespace: 'Test:UserRoleMappings:RevokeUserRole',
});

// ========== 测试配置 ==========

const API_URL = `http://${env.host}:${env.port}/trpc`;

// 已初始化的系统管理员账户
const ADMIN_USER = {
  username: 'admin',
  password: 'Admin@123456',
};

const timestamp = Date.now();

// 待创建的测试用户
const NEW_USER = {
  username: `test_user_rur_${timestamp}`,
  email: `test_user_rur_${timestamp}@test.com`,
  nickname: '测试用户（撤销用户角色）',
  passwordHash: '',
};

// 待创建的测试角色
const NEW_ROLE = {
  code: `test_role_rur_${timestamp}`,
  name: '测试角色（撤销用户角色）',
  description: '用于测试撤销用户角色的角色',
  level: 10,
  isSystem: false,
  isActive: true,
};

// ========== 路由别名 ==========

const getAuthApi = (client: Client) => client.core.identify.auth;
const getUsersApi = (client: Client) => client.core.identify.users;
const getRolesApi = (client: Client) =>
  client.core.accessControl.roles;
const getMappingsApi = (client: Client) =>
  client.core.accessControl.userRoleMappings;

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

/** 生成密码哈希 */
async function hashPassword(plain: string): Promise<string> {
  return Bun.password.hash(plain);
}

// ========== 测试用例 ==========

/** 创建测试用户 */
async function createTestUser(client: Client) {
  const usersApi = getUsersApi(client);
  const passwordHash = await hashPassword('TestUser@123456');
  const user = await usersApi.create.mutate({
    ...NEW_USER,
    passwordHash,
  });
  logger.info('测试用户创建成功', {
    id: user.id,
    username: user.username,
  });
  return user;
}

/** 创建测试角色 */
async function createTestRole(client: Client) {
  const rolesApi = getRolesApi(client);
  const role = await rolesApi.create.mutate(NEW_ROLE);
  logger.info('测试角色创建成功', { id: role.id, code: role.code });
  return role;
}

/** 分配角色给用户 */
async function assignRole(
  client: Client,
  userId: string,
  roleId: string
) {
  const mappingsApi = getMappingsApi(client);
  const mapping = await mappingsApi.assign.mutate({
    userId,
    roleId,
    assignReason: '测试分配',
  });
  logger.info('角色分配成功', { mappingId: mapping.id });
  return mapping;
}

/** 测试撤销用户的某个角色 */
async function testRevokeUserRole(
  client: Client,
  userId: string,
  roleId: string
) {
  logger.info('测试撤销用户的某个角色...', { userId, roleId });

  const mappingsApi = getMappingsApi(client);
  await mappingsApi.revokeUserRole.mutate({ userId, roleId });

  logger.info('用户角色撤销成功', { userId, roleId });
}

/** 验证撤销结果 */
async function verifyRevocation(client: Client, userId: string) {
  logger.info('验证撤销结果...');

  const mappingsApi = getMappingsApi(client);

  // 获取用户的有效角色（应该为空，因为被撤销了）
  const activeRoles = await mappingsApi.activeByUser.query({
    userId,
  });

  if (activeRoles.length > 0) {
    throw new Error('撤销验证失败：用户仍有有效角色');
  }

  logger.info('撤销验证成功：用户没有有效角色');
}

/** 删除测试用户 */
async function deleteTestUser(client: Client, userId: string) {
  const usersApi = getUsersApi(client);
  await usersApi.delete.mutate({ id: userId });
  logger.info('测试用户删除成功', { userId });
}

/** 删除测试角色 */
async function deleteTestRole(client: Client, roleId: string) {
  const rolesApi = getRolesApi(client);
  await rolesApi.delete.mutate({ id: roleId });
  logger.info('测试角色删除成功', { roleId });
}

// ========== 主测试流程 ==========

async function main() {
  logger.info('开始撤销用户角色 API 测试', { apiUrl: API_URL });

  const client = createClient(API_URL);
  let testUserId: string | undefined;
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

    // 3. 创建测试用户和角色
    const testUser = await createTestUser(authedClient);
    testUserId = testUser.id;

    const testRole = await createTestRole(authedClient);
    testRoleId = testRole.id;

    // 4. 分配角色给用户
    await assignRole(authedClient, testUserId, testRoleId);

    // 5. 撤销用户的某个角色
    await testRevokeUserRole(authedClient, testUserId, testRoleId);

    // 6. 验证撤销结果
    await verifyRevocation(authedClient, testUserId);

    logger.info('测试通过！');
  } catch (error) {
    logger.error('测试失败', { error });
    process.exitCode = 1;
  } finally {
    // 清理测试数据
    if (accessToken) {
      const authedClient = createClient(API_URL, {
        token: accessToken,
      });

      if (testUserId) {
        try {
          await deleteTestUser(authedClient, testUserId);
        } catch (e) {
          logger.warn('清理测试用户失败', { error: e });
        }
      }

      if (testRoleId) {
        try {
          await deleteTestRole(authedClient, testRoleId);
        } catch (e) {
          logger.warn('清理测试角色失败', { error: e });
        }
      }
    }
  }
}

// 运行测试
main();
