/**
 * 更新组织成员 API 测试
 *
 * 测试流程：
 * 1. 使用已初始化的系统管理员登录获取 Token
 * 2. 创建测试组织
 * 3. 创建测试用户
 * 4. 添加测试成员
 * 5. 调用 update API 更新成员信息
 * 6. 验证更新成功
 * 7. 清理测试数据
 *
 * 运行: bun run src/modules/hot-update/organization-members/__test__/api/update.ts
 */

import { env } from '@/common/env';
import { createClient, type Client } from '@client/index';
import { createLogger } from '@rapid-s/logger';

// ========== Logger 实例 ==========
const logger = createLogger({ namespace: 'Test:OrgMembers:Update' });

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

/** 测试更新组织成员 */
async function testUpdateMember(
  accessToken: string,
  memberId: string
) {
  logger.info('测试更新组织成员...');

  const authedClient = createClient(API_URL, { token: accessToken });
  const membersApi = getMembersApi(authedClient);

  // 将角色从 member 更新为 admin
  const updatedMember = await membersApi.update.mutate({
    id: memberId,
    role: 'admin',
  });

  logger.info('更新组织成员成功', {
    id: updatedMember?.id,
    role: updatedMember?.role,
    isActive: updatedMember?.isActive,
  });

  // 验证角色已更新
  if (updatedMember?.role !== 'admin') {
    throw new Error(
      `角色更新失败: 期望 'admin'，实际 '${updatedMember?.role}'`
    );
  }

  return updatedMember;
}

// ========== 主测试流程 ==========

async function main() {
  logger.info('开始 update API 测试', { apiUrl: API_URL });

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

    // 5. 测试更新成员
    await testUpdateMember(accessToken, member.id);

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
