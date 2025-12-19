/**
 * 组织详情（根据 Slug）API 测试
 *
 * 测试流程：
 * 1. 使用已初始化的系统管理员登录获取 Token
 * 2. 创建测试组织
 * 3. 调用 bySlug 根据 slug 获取组织详情
 * 4. 验证返回结果正确
 * 5. 测试查询不存在的组织
 * 6. 通过 API 清理测试数据
 *
 * 运行: bun run src/modules/hot-update/organizations/__test__/api/bySlug.ts
 */

import { env } from '@/common/env';
import { createClient, type Client } from '@client/index';
import { createLogger } from '@rapid-s/logger';

// ========== Logger 实例 ==========
const logger = createLogger({ namespace: 'Test:OrganizationBySlug' });

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
  description: '用于 bySlug 测试的组织',
};

// ========== 路由别名 ==========

const getAuthApi = (client: Client) => client.core.identify.auth;
const getOrganizationsApi = (client: Client) =>
  client.hotUpdate.manage.organizations;

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
  };
}

/** 创建测试组织（准备测试数据） */
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
    slug: newOrg.slug,
  });

  return newOrg;
}

/** 测试根据 slug 获取组织详情 */
async function testGetOrganizationBySlug(
  accessToken: string,
  slug: string,
  expectedOrgId: string
) {
  logger.info('测试根据 slug 获取组织详情...', { slug });

  const authedClient = createClient(API_URL, { token: accessToken });
  const organizationsApi = getOrganizationsApi(authedClient);

  const organization = await organizationsApi.bySlug.query({ slug });

  if (!organization) {
    throw new Error(`组织 ${slug} 不存在`);
  }

  // 验证返回数据正确
  if (organization.id !== expectedOrgId) {
    throw new Error(
      `返回的组织 ID 不匹配: ${organization.id} !== ${expectedOrgId}`
    );
  }

  if (organization.slug !== slug) {
    throw new Error(`返回的组织 slug 不匹配`);
  }

  if (organization.name !== TEST_ORGANIZATION.name) {
    throw new Error(`返回的组织名称不匹配`);
  }

  logger.info('组织详情获取成功', {
    id: organization.id,
    name: organization.name,
    slug: organization.slug,
    description: organization.description,
    ownerId: organization.ownerId,
    createdAt: organization.createdAt,
  });

  return organization;
}

/** 测试查询不存在的组织（通过 slug） */
async function testGetNonExistentOrganizationBySlug(
  accessToken: string
) {
  logger.info('测试查询不存在的组织（通过 slug）...');

  const authedClient = createClient(API_URL, { token: accessToken });
  const organizationsApi = getOrganizationsApi(authedClient);

  // 使用一个随机不存在的 slug
  const nonExistentSlug = `non-existent-org-${Date.now()}-${Math.random()}`;
  const organization = await organizationsApi.bySlug.query({
    slug: nonExistentSlug,
  });

  if (organization !== null) {
    throw new Error('查询不存在的组织应该返回 null');
  }

  logger.info('验证成功：查询不存在的组织返回 null');
}

/** 删除测试组织（清理测试数据） */
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

// ========== 主测试流程 ==========

async function main() {
  logger.info('开始 bySlug API 测试', { apiUrl: API_URL });

  const client = createClient(API_URL);
  let testOrgId: string | undefined;
  let accessToken: string | undefined;

  try {
    // 1. 管理员登录
    const loginResult = await testAdminLogin(client);
    accessToken = loginResult.accessToken;

    // 2. 创建测试组织
    const testOrg = await createTestOrganization(accessToken);
    testOrgId = testOrg.id;

    // 3. 测试根据 slug 获取组织详情
    await testGetOrganizationBySlug(
      accessToken,
      TEST_ORGANIZATION.slug,
      testOrgId
    );

    // 4. 测试查询不存在的组织
    await testGetNonExistentOrganizationBySlug(accessToken);

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
        logger.warn('清理测试数据失败', { error: cleanupError });
      }
    }
  }
}

// 运行测试
main();
