/**
 * 组织创建 API 测试
 *
 * 测试流程：
 * 1. 使用已初始化的系统管理员登录获取 Token
 * 2. 使用管理员 Token 调用 create organization API
 * 3. 验证创建成功
 * 4. 通过 API 清理测试数据
 *
 * 运行: bun run src/modules/hot-update/organizations/__test__/api/create.ts
 */

import { env } from '@/common/env';
import { createClient, type Client } from '@client/index';
import { createLogger } from '@rapid-s/logger';

// ========== Logger 实例 ==========
const logger = createLogger({ namespace: 'Test:OrganizationCreate' });

// ========== 测试配置 ==========

const API_URL = `http://${env.host}:${env.port}/trpc`;

// 已初始化的系统管理员账户（来自 scripts/init/config）
const ADMIN_USER = {
  username: 'admin',
  password: 'Admin@123456',
};

// 待创建的测试组织
const NEW_ORGANIZATION = {
  name: `测试组织_${Date.now()}`,
  slug: `test-org-${Date.now()}`,
  description: '这是一个测试组织',
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

/** 测试创建组织 */
async function testCreateOrganization(accessToken: string) {
  logger.info('测试创建组织...');

  const authedClient = createClient(API_URL, { token: accessToken });
  const organizationsApi = getOrganizationsApi(authedClient);

  const newOrg = await organizationsApi.create.mutate({
    name: NEW_ORGANIZATION.name,
    slug: NEW_ORGANIZATION.slug,
    description: NEW_ORGANIZATION.description,
  });

  logger.info('组织创建成功', {
    id: newOrg.id,
    name: newOrg.name,
    slug: newOrg.slug,
    ownerId: newOrg.ownerId,
  });

  return newOrg;
}

/** 测试查询组织（验证创建结果） */
async function testGetOrganization(
  accessToken: string,
  slug: string
) {
  logger.info('测试查询组织...', { slug });

  const authedClient = createClient(API_URL, { token: accessToken });
  const organizationsApi = getOrganizationsApi(authedClient);
  const org = await organizationsApi.bySlug.query({ slug });

  if (!org) {
    throw new Error(`组织 ${slug} 不存在`);
  }

  logger.info('组织查询成功', {
    id: org.id,
    name: org.name,
    slug: org.slug,
  });

  return org;
}

/** 测试删除组织（清理测试数据） */
async function testDeleteOrganization(
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
  logger.info('开始组织创建 API 测试', { apiUrl: API_URL });

  const client = createClient(API_URL);
  let newOrgId: string | undefined;
  let accessToken: string | undefined;

  try {
    // 1. 管理员登录
    const loginResult = await testAdminLogin(client);
    accessToken = loginResult.accessToken;

    // 2. 创建新组织
    const newOrg = await testCreateOrganization(accessToken);
    newOrgId = newOrg.id;

    // 3. 查询创建的组织（验证创建成功）
    await testGetOrganization(accessToken, NEW_ORGANIZATION.slug);

    logger.info('所有测试通过！');
  } catch (error) {
    logger.error('测试失败', { error });
    process.exitCode = 1;
  } finally {
    // 清理测试数据：通过 API 删除创建的组织
    if (newOrgId && accessToken) {
      try {
        await testDeleteOrganization(accessToken, newOrgId);
      } catch (cleanupError) {
        logger.warn('清理测试数据失败', { error: cleanupError });
      }
    }
  }
}

// 运行测试
main();
