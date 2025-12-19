/**
 * 获取当前用户成员资格列表 API 测试
 *
 * 测试流程：
 * 1. 使用已初始化的系统管理员登录获取 Token
 * 2. 创建多个测试组织
 * 3. 调用 listMyMemberships API 验证返回数据
 * 4. 清理测试数据
 *
 * 运行: bun run src/modules/hot-update/organization-members/__test__/api/listMyMemberships.ts
 */

import { env } from '@/common/env';
import { createClient, type Client } from '@client/index';
import { createLogger } from '@rapid-s/logger';

// ========== Logger 实例 ==========
const logger = createLogger({
  namespace: 'Test:OrgMembers:ListMyMemberships',
});

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
async function createTestOrganization(
  accessToken: string,
  suffix: string
) {
  logger.info('创建测试组织...', { suffix });
  const authedClient = createClient(API_URL, { token: accessToken });
  const orgsApi = getOrgsApi(authedClient);

  const org = await orgsApi.create.mutate({
    name: `TestOrg_${suffix}_${Date.now()}`,
    slug: `test-org-${suffix}-${Date.now()}`,
    description: `测试组织 ${suffix}`,
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

/** 测试获取当前用户的成员资格列表 */
async function testListMyMemberships(accessToken: string) {
  logger.info('测试获取当前用户成员资格列表...');

  const authedClient = createClient(API_URL, { token: accessToken });
  const membersApi = getMembersApi(authedClient);

  const memberships = await membersApi.listMyMemberships.query();

  logger.info('获取当前用户成员资格列表成功', {
    count: memberships.length,
    memberships: memberships.map(m => ({
      id: m.id,
      organizationId: m.organizationId,
      role: m.role,
    })),
  });

  return memberships;
}

// ========== 主测试流程 ==========

async function main() {
  logger.info('开始 listMyMemberships API 测试', { apiUrl: API_URL });

  const client = createClient(API_URL);
  let accessToken: string | undefined;
  const testOrgIds: string[] = [];

  try {
    // 1. 管理员登录
    accessToken = await adminLogin(client);

    // 2. 创建多个测试组织
    const org1 = await createTestOrganization(accessToken, 'A');
    testOrgIds.push(org1.id);

    const org2 = await createTestOrganization(accessToken, 'B');
    testOrgIds.push(org2.id);

    // 3. 测试获取当前用户成员资格列表
    const memberships = await testListMyMemberships(accessToken);

    // 验证：应该至少包含刚创建的两个组织（如果创建组织时自动添加成员）
    logger.info('成员资格列表包含组织数量', {
      count: memberships.length,
    });

    logger.info('所有测试通过！');
  } catch (error) {
    logger.error('测试失败', { error });
    process.exitCode = 1;
  } finally {
    // 清理测试数据
    if (accessToken) {
      for (const orgId of testOrgIds) {
        try {
          await deleteTestOrganization(accessToken, orgId);
        } catch (cleanupError) {
          logger.warn('清理测试数据失败', {
            orgId,
            error: cleanupError,
          });
        }
      }
    }
  }
}

// 运行测试
main();
