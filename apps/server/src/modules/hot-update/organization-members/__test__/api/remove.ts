/**
 * 移除组织成员 API 测试
 *
 * 测试流程：
 * 1. 使用已初始化的系统管理员登录获取 Token
 * 2. 创建测试组织
 * 3. 创建测试用户
 * 4. 添加测试成员
 * 5. 调用 remove API 移除成员
 * 6. 验证成员已移除
 * 7. 清理测试数据
 *
 * 运行: bun run src/modules/hot-update/organization-members/__test__/api/remove.ts
 */

import { env } from '@/common/env';
import { createClient, type Client } from '@client/index';
import { createLogger } from '@rapid-s/logger';

// ========== Logger 实例 ==========
const logger = createLogger({ namespace: 'Test:OrgMembers:Remove' });

// ========== 测试配置 ==========
const API_URL = `http://${env.host}:${env.port}/trpc`;

// 已初始化的系统管理员账户
const ADMIN_USER = {
  username: 'admin',
  password: 'Admin@123456',
};

// 待创建的测试用户
const createTestUserData = () => ({
  username: `test_member_${Date.now()}`,
  email: `test_member_${Date.now()}@test.com`,
  nickname: '测试成员',
  password: 'TestMember@123456',
});

// ========== 路由别名 ==========
const getAuthApi = (client: Client) => client.core.identify.auth;
const getUsersApi = (client: Client) => client.core.identify.users;
const getOrgsApi = (client: Client) => client.hotUpdate.organizations;
const getMembersApi = (client: Client) =>
  client.hotUpdate.organizationMembers;

// ========== 测试辅助函数 ==========

/** 生成密码哈希 */
async function hashPassword(plain: string): Promise<string> {
  return Bun.password.hash(plain);
}

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

/** 创建测试用户 */
async function createTestUser(accessToken: string) {
  logger.info('创建测试用户...');
  const authedClient = createClient(API_URL, { token: accessToken });
  const usersApi = getUsersApi(authedClient);

  const userData = createTestUserData();
  const passwordHash = await hashPassword(userData.password);

  const user = await usersApi.create.mutate({
    username: userData.username,
    passwordHash,
    email: userData.email,
    nickname: userData.nickname,
  });

  logger.info('测试用户创建成功', {
    id: user.id,
    username: user.username,
  });
  return user;
}

/** 删除测试用户 */
async function deleteTestUser(accessToken: string, userId: string) {
  logger.info('删除测试用户...', { userId });
  const authedClient = createClient(API_URL, { token: accessToken });
  const usersApi = getUsersApi(authedClient);
  await usersApi.delete.mutate({ id: userId });
  logger.info('测试用户删除成功');
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

/** 添加组织成员 */
async function addMember(
  accessToken: string,
  organizationId: string,
  userId: string
) {
  logger.info('添加组织成员...');
  const authedClient = createClient(API_URL, { token: accessToken });
  const membersApi = getMembersApi(authedClient);

  const member = await membersApi.add.mutate({
    organizationId,
    userId,
    role: 'member',
  });

  logger.info('添加组织成员成功', {
    id: member.id,
    role: member.role,
  });
  return member;
}

// ========== 测试用例 ==========

/** 测试移除组织成员 */
async function testRemoveMember(
  accessToken: string,
  memberId: string
) {
  logger.info('测试移除组织成员...');

  const authedClient = createClient(API_URL, { token: accessToken });
  const membersApi = getMembersApi(authedClient);

  const result = await membersApi.remove.mutate({ id: memberId });

  logger.info('移除组织成员成功', { memberId, result });

  return result;
}

/** 验证成员已移除 */
async function verifyMemberRemoved(
  accessToken: string,
  organizationId: string
) {
  logger.info('验证成员已移除...');

  const authedClient = createClient(API_URL, { token: accessToken });
  const membersApi = getMembersApi(authedClient);

  const members = await membersApi.listByOrganization.query({
    organizationId,
  });

  logger.info('获取组织成员列表（移除后）', {
    count: members.length,
    members: members.map(m => ({
      id: m.id,
      userId: m.userId,
      role: m.role,
    })),
  });

  return members;
}

// ========== 主测试流程 ==========

async function main() {
  logger.info('开始 remove API 测试', { apiUrl: API_URL });

  const client = createClient(API_URL);
  let accessToken: string | undefined;
  let testOrgId: string | undefined;
  let testUserId: string | undefined;

  try {
    // 1. 管理员登录
    accessToken = await adminLogin(client);

    // 2. 创建测试组织
    const org = await createTestOrganization(accessToken);
    testOrgId = org.id;

    // 3. 创建测试用户
    const user = await createTestUser(accessToken);
    testUserId = user.id;

    // 4. 添加成员
    const member = await addMember(
      accessToken,
      testOrgId,
      testUserId
    );

    // 5. 测试移除成员
    await testRemoveMember(accessToken, member.id);

    // 6. 验证成员已移除
    await verifyMemberRemoved(accessToken, testOrgId);

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
    if (testUserId && accessToken) {
      try {
        await deleteTestUser(accessToken, testUserId);
      } catch (cleanupError) {
        logger.warn('清理测试用户失败', { error: cleanupError });
      }
    }
  }
}

// 运行测试
main();
