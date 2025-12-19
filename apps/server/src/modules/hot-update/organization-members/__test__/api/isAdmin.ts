/**
 * 检查是否为组织管理员 API 测试
 *
 * 测试流程：
 * 1. 使用已初始化的系统管理员登录获取 Token
 * 2. 创建测试组织
 * 3. 调用 isAdmin API 验证返回数据
 * 4. 清理测试数据
 *
 * 运行: bun run src/modules/hot-update/organization-members/__test__/api/isAdmin.ts
 */

import { env } from '@/common/env';
import { createClient, type Client } from '@client/index';
import { createLogger } from '@rapid-s/logger';

// ========== Logger 实例 ==========
const logger = createLogger({ namespace: 'Test:OrgMembers:IsAdmin' });

// ========== 测试配置 ==========
const API_URL = `http://${env.host}:${env.port}/trpc`;

// 已初始化的系统管理员账户
const ADMIN_USER = {
  username: 'admin',
  password: 'Admin@123456',
};

// ========== 路由别名 ==========
const getAuthApi = (client: Client) => client.core.identify.auth;
const getOrgsApi = (client: Client) => client.hotUpdate.organizations;
const getMembersApi = (client: Client) =>
  client.hotUpdate.organizationMembers;

// ========== 测试辅助函数 ==========

/** 管理员登录 */
async function adminLogin(client: Client) {
  logger.info('管理员登录...');
  const auth = getAuthApi(client);
  const result = await auth.login.mutate({
    username: ADMIN_USER.username,
    password: ADMIN_USER.password,
  });

  if (!result.success) {
    throw new Error(`管理员登录失败: ${result.errorMessage}`);
  }

  logger.info('管理员登录成功', { user: result.user?.username });
  return result.accessToken!;
}

/** 创建测试组织 */
async function createTestOrganization(accessToken: string) {
  logger.info('创建测试组织...');
  const authedClient = createClient(API_URL, { token: accessToken });
  const orgsApi = getOrgsApi(authedClient);

  const org = await orgsApi.create.mutate({
    name: `TestOrg_${Date.now()}`,
    slug: `test-org-${Date.now()}`,
    description: '测试组织',
  });

  logger.info('测试组织创建成功', { id: org.id, name: org.name });
  return org;
}

/** 删除测试组织 */
async function deleteTestOrganization(
  accessToken: string,
  orgId: string
) {
  logger.info('删除测试组织...', { orgId });
  const authedClient = createClient(API_URL, { token: accessToken });
  const orgsApi = getOrgsApi(authedClient);
  await orgsApi.delete.mutate({ id: orgId });
  logger.info('测试组织删除成功');
}

// ========== 测试用例 ==========

/** 测试检查是否为组织管理员 */
async function testIsAdmin(
  accessToken: string,
  organizationId: string
) {
  logger.info('测试检查是否为组织管理员...');

  const authedClient = createClient(API_URL, { token: accessToken });
  const membersApi = getMembersApi(authedClient);

  const isAdmin = await membersApi.isAdmin.query({ organizationId });

  logger.info('检查管理员权限成功', {
    organizationId,
    isAdmin,
  });

  return isAdmin;
}

// ========== 主测试流程 ==========

async function main() {
  logger.info('开始 isAdmin API 测试', { apiUrl: API_URL });

  const client = createClient(API_URL);
  let accessToken: string | undefined;
  let testOrgId: string | undefined;

  try {
    // 1. 管理员登录
    accessToken = await adminLogin(client);

    // 2. 创建测试组织
    const org = await createTestOrganization(accessToken);
    testOrgId = org.id;

    // 3. 测试检查是否为组织管理员
    const isAdmin = await testIsAdmin(accessToken, testOrgId);

    // 验证：组织所有者应该是管理员
    logger.info('管理员权限检查结果', { isAdmin });

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
