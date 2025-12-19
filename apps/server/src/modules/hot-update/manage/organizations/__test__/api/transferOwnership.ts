/**
 * 组织所有权转让 API 测试
 *
 * 测试流程：
 * 1. 使用已初始化的系统管理员登录获取 Token
 * 2. 创建测试组织（管理员为所有者）
 * 3. 创建第二个测试用户作为新所有者
 * 4. 调用 transferOwnership 转让组织所有权
 * 5. 验证所有权已转让
 * 6. 通过 API 清理测试数据
 *
 * 运行: bun run src/modules/hot-update/organizations/__test__/api/transferOwnership.ts
 */

import { env } from '@/common/env';
import { createClient, type Client } from '@client/index';
import { createLogger } from '@rapid-s/logger';

// ========== Logger 实例 ==========
const logger = createLogger({
  namespace: 'Test:OrganizationTransferOwnership',
});

// ========== 测试配置 ==========

const API_URL = `http://${env.host}:${env.port}/trpc`;

// 已初始化的系统管理员账户（来自 scripts/init/config）
const ADMIN_USER = {
  username: 'admin',
  password: 'Admin@123456',
};

// 待创建的测试组织
const TEST_ORGANIZATION = {
  name: `测试组织_${Date.now()}`,
  slug: `test-org-${Date.now()}`,
  description: '用于 transferOwnership 测试的组织',
};

// 待创建的新所有者用户
const NEW_OWNER_USER = {
  username: `new_owner_${Date.now()}`,
  email: `new_owner_${Date.now()}@test.com`,
  nickname: '新所有者',
  password: 'NewOwner@123456',
};

// ========== 路由别名 ==========

const getAuthApi = (client: Client) => client.core.identify.auth;
const getUsersApi = (client: Client) => client.core.identify.users;
const getOrganizationsApi = (client: Client) =>
  client.hotUpdate.manage.organizations;

// ========== 测试辅助函数 ==========

/** 生成密码哈希 */
async function hashPassword(plain: string): Promise<string> {
  return Bun.password.hash(plain);
}

// ========== 测试用例 ==========

/** 测试管理员登录 */
async function testAdminLogin(client: Client) {
  logger.info('测试管理员登录...');

  const auth = getAuthApi(client);
  const result = await auth.login.mutate({
    username: ADMIN_USER.username,
    password: ADMIN_USER.password,
  });

  if (!result.success) {
    throw new Error(`管理员登录失败: ${result.errorMessage}`);
  }

  logger.info('管理员登录成功', { user: result.user?.username });

  return {
    accessToken: result.accessToken!,
    refreshToken: result.refreshToken!,
    userId: result.user!.id,
  };
}

/** 创建测试用户（作为新所有者） */
async function createNewOwnerUser(accessToken: string) {
  logger.info('创建新所有者用户...');

  const authedClient = createClient(API_URL, { token: accessToken });
  const usersApi = getUsersApi(authedClient);

  const passwordHash = await hashPassword(NEW_OWNER_USER.password);

  const newUser = await usersApi.create.mutate({
    username: NEW_OWNER_USER.username,
    passwordHash,
    email: NEW_OWNER_USER.email,
    nickname: NEW_OWNER_USER.nickname,
  });

  logger.info('新所有者用户创建成功', {
    id: newUser.id,
    username: newUser.username,
  });

  return newUser;
}

/** 创建测试组织 */
async function createTestOrganization(accessToken: string) {
  logger.info('创建测试组织...');

  const authedClient = createClient(API_URL, { token: accessToken });
  const organizationsApi = getOrganizationsApi(authedClient);

  const newOrg = await organizationsApi.create.mutate({
    name: TEST_ORGANIZATION.name,
    slug: TEST_ORGANIZATION.slug,
    description: TEST_ORGANIZATION.description,
  });

  logger.info('测试组织创建成功', {
    id: newOrg.id,
    name: newOrg.name,
    ownerId: newOrg.ownerId,
  });

  return newOrg;
}

/** 测试转让组织所有权 */
async function testTransferOwnership(
  accessToken: string,
  orgId: string,
  newOwnerId: string
) {
  logger.info('测试转让组织所有权...', { orgId, newOwnerId });

  const authedClient = createClient(API_URL, { token: accessToken });
  const organizationsApi = getOrganizationsApi(authedClient);

  const updatedOrg = await organizationsApi.transferOwnership.mutate({
    id: orgId,
    newOwnerId,
  });

  if (!updatedOrg) {
    throw new Error(`转让所有权失败: 返回 null`);
  }

  // 验证所有权已转让
  if (updatedOrg.ownerId !== newOwnerId) {
    throw new Error(
      `所有权转让失败: ${updatedOrg.ownerId} !== ${newOwnerId}`
    );
  }

  logger.info('所有权转让成功', {
    id: updatedOrg.id,
    name: updatedOrg.name,
    newOwnerId: updatedOrg.ownerId,
    updatedAt: updatedOrg.updatedAt,
  });

  return updatedOrg;
}

/** 验证组织所有权 */
async function verifyOwnership(
  accessToken: string,
  orgId: string,
  expectedOwnerId: string
) {
  logger.info('验证组织所有权...', { orgId, expectedOwnerId });

  const authedClient = createClient(API_URL, { token: accessToken });
  const organizationsApi = getOrganizationsApi(authedClient);

  const org = await organizationsApi.byId.query({ id: orgId });

  if (!org) {
    throw new Error(`组织 ${orgId} 不存在`);
  }

  if (org.ownerId !== expectedOwnerId) {
    throw new Error(
      `所有权验证失败: ${org.ownerId} !== ${expectedOwnerId}`
    );
  }

  logger.info('所有权验证成功', {
    orgId: org.id,
    ownerId: org.ownerId,
  });

  return org;
}

/** 测试转让不存在的组织 */
async function testTransferNonExistentOrganization(
  accessToken: string,
  newOwnerId: string
) {
  logger.info('测试转让不存在的组织...');

  const authedClient = createClient(API_URL, { token: accessToken });
  const organizationsApi = getOrganizationsApi(authedClient);

  // 使用一个随机 UUID
  const nonExistentId = '00000000-0000-0000-0000-000000000000';
  const result = await organizationsApi.transferOwnership.mutate({
    id: nonExistentId,
    newOwnerId,
  });

  if (result !== null) {
    throw new Error('转让不存在的组织应该返回 null');
  }

  logger.info('验证成功：转让不存在的组织返回 null');
}

/** 删除测试组织 */
async function deleteTestOrganization(
  accessToken: string,
  orgId: string
) {
  logger.info('删除测试组织...', { orgId });

  const authedClient = createClient(API_URL, { token: accessToken });
  const organizationsApi = getOrganizationsApi(authedClient);

  await organizationsApi.delete.mutate({ id: orgId });

  logger.info('组织删除成功', { orgId });
}

/** 删除测试用户 */
async function deleteTestUser(accessToken: string, userId: string) {
  logger.info('删除测试用户...', { userId });

  const authedClient = createClient(API_URL, { token: accessToken });
  const usersApi = getUsersApi(authedClient);

  await usersApi.delete.mutate({ id: userId });

  logger.info('用户删除成功', { userId });
}

// ========== 主测试流程 ==========

async function main() {
  logger.info('开始 transferOwnership API 测试', { apiUrl: API_URL });

  const client = createClient(API_URL);
  let testOrgId: string | undefined;
  let newOwnerUserId: string | undefined;
  let accessToken: string | undefined;
  let originalOwnerId: string | undefined;

  try {
    // 1. 管理员登录
    const loginResult = await testAdminLogin(client);
    accessToken = loginResult.accessToken;
    originalOwnerId = loginResult.userId;

    // 2. 创建新所有者用户
    const newOwnerUser = await createNewOwnerUser(accessToken);
    newOwnerUserId = newOwnerUser.id;

    // 3. 创建测试组织（管理员为初始所有者）
    const testOrg = await createTestOrganization(accessToken);
    testOrgId = testOrg.id;

    // 4. 验证初始所有者
    await verifyOwnership(accessToken, testOrgId, originalOwnerId);

    // 5. 测试转让组织所有权
    await testTransferOwnership(
      accessToken,
      testOrgId,
      newOwnerUserId
    );

    // 6. 验证所有权已转让
    await verifyOwnership(accessToken, testOrgId, newOwnerUserId);

    // 7. 测试转让不存在的组织
    await testTransferNonExistentOrganization(
      accessToken,
      newOwnerUserId
    );

    logger.info('所有测试通过！');
  } catch (error) {
    logger.error('测试失败', { error });
    process.exitCode = 1;
  } finally {
    // 清理测试数据
    if (testOrgId && accessToken) {
      try {
        await deleteTestOrganization(accessToken, testOrgId);
      } catch (cleanupError) {
        logger.warn('清理测试组织失败', { error: cleanupError });
      }
    }

    if (newOwnerUserId && accessToken) {
      try {
        await deleteTestUser(accessToken, newOwnerUserId);
      } catch (cleanupError) {
        logger.warn('清理测试用户失败', { error: cleanupError });
      }
    }
  }
}

// 运行测试
main();
