/**
 * 分配角色给用户 API 测试
 *
 * 测试流程：
 * 1. 使用已初始化的系统管理员登录获取 Token
 * 2. 创建测试用户和测试角色
 * 3. 调用 assign API 分配角色给用户
 * 4. 验证分配成功
 * 5. 清理测试数据
 *
 * 运行: bun run src/modules/core/access-control/user-role-mappings/__test__/api/assign.ts
 */

import { env } from '@/common/env';
import { createClient, type Client } from '@client/index';
import { createLogger } from '@rapid-s/logger';

// ========== Logger 实例 ==========
const logger = createLogger({
  namespace: 'Test:UserRoleMappings:Assign',
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
  username: `test_user_assign_${timestamp}`,
  email: `test_user_assign_${timestamp}@test.com`,
  nickname: '测试用户（角色分配）',
  passwordHash: '',
};

// 待创建的测试角色
const NEW_ROLE = {
  code: `test_role_assign_${timestamp}`,
  name: '测试角色（用户分配）',
  description: '用于测试角色分配的角色',
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
  logger.info('创建测试用户...');

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
  logger.info('创建测试角色...');

  const rolesApi = getRolesApi(client);
  const role = await rolesApi.create.mutate(NEW_ROLE);

  logger.info('测试角色创建成功', { id: role.id, code: role.code });

  return role;
}

/** 测试分配角色给用户 */
async function testAssignRole(
  client: Client,
  userId: string,
  roleId: string
) {
  logger.info('测试分配角色给用户...');

  const mappingsApi = getMappingsApi(client);
  const mapping = await mappingsApi.assign.mutate({
    userId,
    roleId,
    assignReason: '测试分配',
  });

  logger.info('角色分配成功', {
    mappingId: mapping.id,
    userId: mapping.userId,
    roleId: mapping.roleId,
    assignedBy: mapping.assignedBy,
  });

  return mapping;
}

/** 验证角色分配结果 */
async function verifyAssignment(client: Client, userId: string) {
  logger.info('验证角色分配结果...');

  const mappingsApi = getMappingsApi(client);
  const userRoles = await mappingsApi.byUser.query({ userId });

  if (userRoles.length === 0) {
    throw new Error('角色分配验证失败：用户没有任何角色');
  }

  logger.info('角色分配验证成功', { roleCount: userRoles.length });

  return userRoles;
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
  logger.info('开始角色分配 API 测试', { apiUrl: API_URL });

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
    await testAssignRole(authedClient, testUserId, testRoleId);

    // 5. 验证分配结果
    await verifyAssignment(authedClient, testUserId);

    logger.info('测试通过！');
  } catch (error) {
    logger.error('测试失败', { error });
    process.exitCode = 1;
  } finally {
    // 清理测试数据（映射会随用户/角色删除而级联删除）
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
