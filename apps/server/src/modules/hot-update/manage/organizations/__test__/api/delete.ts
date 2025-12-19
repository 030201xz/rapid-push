/**
 * 组织删除 API 测试
 *
 * 测试流程：
 * 1. 使用已初始化的系统管理员登录获取 Token
 * 2. 创建测试组织
 * 3. 验证组织存在
 * 4. 调用 delete 删除组织（软删除）
 * 5. 验证删除后组织不可查询
 * 6. 测试删除不存在的组织
 *
 * 运行: bun run src/modules/hot-update/organizations/__test__/api/delete.ts
 */

import { env } from '@/common/env';
import { createClient, type Client } from '@client/index';
import { createLogger } from '@rapid-s/logger';

// ========== Logger 实例 ==========
const logger = createLogger({ namespace: 'Test:OrganizationDelete' });

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
  description: '用于 delete 测试的组织',
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
    name: newOrg.name,
  });

  return newOrg;
}

/** 验证组织存在 */
async function verifyOrganizationExists(
  accessToken: string,
  orgId: string
) {
  logger.info('验证组织存在...', { orgId });

  const authedClient = createClient(API_URL, { token: accessToken });
  const organizationsApi = getOrganizationsApi(authedClient);

  const org = await organizationsApi.byId.query({ id: orgId });

  if (!org) {
    throw new Error(`组织 ${orgId} 应该存在`);
  }

  logger.info('组织存在性验证成功');
  return org;
}

/** 测试删除组织 */
async function testDeleteOrganization(
  accessToken: string,
  orgId: string
) {
  logger.info('测试删除组织...', { orgId });

  const authedClient = createClient(API_URL, { token: accessToken });
  const organizationsApi = getOrganizationsApi(authedClient);

  const result = await organizationsApi.delete.mutate({ id: orgId });

  // 验证删除成功（软删除应返回 true）
  if (result !== true) {
    throw new Error(`删除组织失败: 返回 ${result}`);
  }

  logger.info('组织删除成功', { orgId, result });

  return result;
}

/** 验证组织已被删除（不可查询） */
async function verifyOrganizationDeleted(
  accessToken: string,
  orgId: string
) {
  logger.info('验证组织已被删除...', { orgId });

  const authedClient = createClient(API_URL, { token: accessToken });
  const organizationsApi = getOrganizationsApi(authedClient);

  const org = await organizationsApi.byId.query({ id: orgId });

  // 软删除后，通过 byId 应该查询不到
  if (org !== null) {
    throw new Error(`已删除的组织不应该被查询到`);
  }

  logger.info('验证成功：删除后组织不可查询');
}

/** 验证组织不在列表中 */
async function verifyOrganizationNotInList(
  accessToken: string,
  orgId: string
) {
  logger.info('验证组织不在列表中...', { orgId });

  const authedClient = createClient(API_URL, { token: accessToken });
  const organizationsApi = getOrganizationsApi(authedClient);

  const organizations = await organizationsApi.listMine.query();

  const foundOrg = organizations.find(org => org.id === orgId);
  if (foundOrg) {
    throw new Error(`已删除的组织不应该出现在列表中`);
  }

  logger.info('验证成功：删除后组织不在列表中');
}

/** 测试删除不存在的组织 */
async function testDeleteNonExistentOrganization(
  accessToken: string
) {
  logger.info('测试删除不存在的组织...');

  const authedClient = createClient(API_URL, { token: accessToken });
  const organizationsApi = getOrganizationsApi(authedClient);

  // 使用一个随机 UUID
  const nonExistentId = '00000000-0000-0000-0000-000000000000';
  const result = await organizationsApi.delete.mutate({
    id: nonExistentId,
  });

  // 删除不存在的组织应该返回 false
  if (result !== false) {
    throw new Error(
      `删除不存在的组织应该返回 false，实际返回 ${result}`
    );
  }

  logger.info('验证成功：删除不存在的组织返回 false');
}

// ========== 主测试流程 ==========

async function main() {
  logger.info('开始 delete API 测试', { apiUrl: API_URL });

  const client = createClient(API_URL);
  let accessToken: string | undefined;

  try {
    // 1. 管理员登录
    const loginResult = await testAdminLogin(client);
    accessToken = loginResult.accessToken;

    // 2. 创建测试组织
    const testOrg = await createTestOrganization(accessToken);
    const testOrgId = testOrg.id;

    // 3. 验证组织存在
    await verifyOrganizationExists(accessToken, testOrgId);

    // 4. 测试删除组织
    await testDeleteOrganization(accessToken, testOrgId);

    // 5. 验证删除后组织不可查询
    await verifyOrganizationDeleted(accessToken, testOrgId);

    // 6. 验证组织不在列表中
    await verifyOrganizationNotInList(accessToken, testOrgId);

    // 7. 测试删除不存在的组织
    await testDeleteNonExistentOrganization(accessToken);

    logger.info('所有测试通过！');
  } catch (error) {
    logger.error('测试失败', { error });
    process.exitCode = 1;
  }
  // 无需清理：测试本身就是删除操作
}

// 运行测试
main();
