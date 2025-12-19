/**
 * 渠道删除 API 测试
 *
 * 测试流程：
 * 1. 使用已初始化的系统管理员登录获取 Token
 * 2. 创建测试组织、项目和渠道
 * 3. 验证渠道存在
 * 4. 调用 delete 删除渠道（软删除）
 * 5. 验证删除后渠道不可查询
 * 6. 测试删除不存在的渠道
 * 7. 清理测试组织和项目
 *
 * 运行: bun run src/modules/hot-update/channels/__test__/api/delete.ts
 */

import { env } from '@/common/env';
import { createClient, type Client } from '@client/index';
import { createLogger } from '@rapid-s/logger';

// ========== Logger 实例 ==========
const logger = createLogger({ namespace: 'Test:ChannelDelete' });

// ========== 测试配置 ==========

const API_URL = `http://${env.host}:${env.port}/trpc`;

// 已初始化的系统管理员账户
const ADMIN_USER = {
  username: 'admin',
  password: 'Admin@123456',
};

// 测试组织
const TEST_ORGANIZATION = {
  name: `测试组织_${Date.now()}`,
  slug: `test-org-${Date.now()}`,
  description: '用于渠道 delete 测试的组织',
};

// 测试项目
const TEST_PROJECT = {
  name: `测试项目_${Date.now()}`,
  slug: `test-project-${Date.now()}`,
  description: '用于渠道 delete 测试的项目',
};

// 测试渠道
const TEST_CHANNEL = {
  name: 'production',
  description: '用于 delete 测试的渠道',
};

// ========== 路由别名 ==========

const getAuthApi = (client: Client) => client.core.identify.auth;
const getOrganizationsApi = (client: Client) =>
  client.hotUpdate.manage.organizations;
const getProjectsApi = (client: Client) =>
  client.hotUpdate.manage.projects;
const getChannelsApi = (client: Client) =>
  client.hotUpdate.manage.channels;

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
  });

  return newOrg;
}

/** 创建测试项目 */
async function createTestProject(
  accessToken: string,
  organizationId: string
) {
  logger.info('创建测试项目...');

  const authedClient = createClient(API_URL, { token: accessToken });
  const projectsApi = getProjectsApi(authedClient);

  const newProject = await projectsApi.create.mutate({
    organizationId,
    name: TEST_PROJECT.name,
    slug: TEST_PROJECT.slug,
    description: TEST_PROJECT.description,
  });

  logger.info('测试项目创建成功', {
    id: newProject.id,
    name: newProject.name,
  });

  return newProject;
}

/** 创建测试渠道 */
async function createTestChannel(
  accessToken: string,
  projectId: string
) {
  logger.info('创建测试渠道...');

  const authedClient = createClient(API_URL, { token: accessToken });
  const channelsApi = getChannelsApi(authedClient);

  const newChannel = await channelsApi.create.mutate({
    projectId,
    name: TEST_CHANNEL.name,
    description: TEST_CHANNEL.description,
  });

  logger.info('测试渠道创建成功', {
    id: newChannel.id,
    name: newChannel.name,
  });

  return newChannel;
}

/** 验证渠道存在 */
async function verifyChannelExists(
  accessToken: string,
  channelId: string
) {
  logger.info('验证渠道存在...', { channelId });

  const authedClient = createClient(API_URL, { token: accessToken });
  const channelsApi = getChannelsApi(authedClient);

  const channel = await channelsApi.byId.query({ id: channelId });

  if (!channel) {
    throw new Error(`渠道 ${channelId} 应该存在`);
  }

  logger.info('渠道存在性验证成功');
  return channel;
}

/** 测试删除渠道 */
async function testDeleteChannel(
  accessToken: string,
  channelId: string
) {
  logger.info('测试删除渠道...', { channelId });

  const authedClient = createClient(API_URL, { token: accessToken });
  const channelsApi = getChannelsApi(authedClient);

  const result = await channelsApi.delete.mutate({ id: channelId });

  // 验证删除成功（软删除应返回 true）
  if (result !== true) {
    throw new Error(`删除渠道失败: 返回 ${result}`);
  }

  logger.info('渠道删除成功', { channelId, result });

  return result;
}

/** 验证渠道已被删除（不可查询） */
async function verifyChannelDeleted(
  accessToken: string,
  channelId: string
) {
  logger.info('验证渠道已被删除...', { channelId });

  const authedClient = createClient(API_URL, { token: accessToken });
  const channelsApi = getChannelsApi(authedClient);

  const channel = await channelsApi.byId.query({ id: channelId });

  // 软删除后，通过 byId 应该查询不到
  if (channel !== null) {
    throw new Error(`已删除的渠道不应该被查询到`);
  }

  logger.info('验证成功：删除后渠道不可查询');
}

/** 验证渠道不在项目列表中 */
async function verifyChannelNotInList(
  accessToken: string,
  projectId: string,
  channelId: string
) {
  logger.info('验证渠道不在项目列表中...', { projectId, channelId });

  const authedClient = createClient(API_URL, { token: accessToken });
  const channelsApi = getChannelsApi(authedClient);

  const channels = await channelsApi.listByProject.query({
    projectId,
  });

  const foundChannel = channels.find(c => c.id === channelId);
  if (foundChannel) {
    throw new Error(`已删除的渠道不应该出现在项目列表中`);
  }

  logger.info('验证成功：删除后渠道不在项目列表中');
}

/** 测试删除不存在的渠道 */
async function testDeleteNonExistentChannel(accessToken: string) {
  logger.info('测试删除不存在的渠道...');

  const authedClient = createClient(API_URL, { token: accessToken });
  const channelsApi = getChannelsApi(authedClient);

  // 使用一个随机 UUID
  const nonExistentId = '00000000-0000-0000-0000-000000000000';
  const result = await channelsApi.delete.mutate({
    id: nonExistentId,
  });

  // 删除不存在的渠道应该返回 false
  if (result !== false) {
    throw new Error(
      `删除不存在的渠道应该返回 false，实际返回 ${result}`
    );
  }

  logger.info('验证成功：删除不存在的渠道返回 false');
}

/** 删除测试项目 */
async function deleteTestProject(
  accessToken: string,
  projectId: string
) {
  logger.info('删除测试项目...', { projectId });

  const authedClient = createClient(API_URL, { token: accessToken });
  const projectsApi = getProjectsApi(authedClient);

  await projectsApi.delete.mutate({ id: projectId });

  logger.info('项目删除成功', { projectId });
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

// ========== 主测试流程 ==========

async function main() {
  logger.info('开始 delete API 测试', { apiUrl: API_URL });

  const client = createClient(API_URL);
  let testOrgId: string | undefined;
  let testProjectId: string | undefined;
  let accessToken: string | undefined;

  try {
    // 1. 管理员登录
    const loginResult = await testAdminLogin(client);
    accessToken = loginResult.accessToken;

    // 2. 创建测试组织
    const testOrg = await createTestOrganization(accessToken);
    testOrgId = testOrg.id;

    // 3. 创建测试项目
    const testProject = await createTestProject(
      accessToken,
      testOrgId
    );
    testProjectId = testProject.id;

    // 4. 创建测试渠道
    const testChannel = await createTestChannel(
      accessToken,
      testProjectId
    );
    const testChannelId = testChannel.id;

    // 5. 验证渠道存在
    await verifyChannelExists(accessToken, testChannelId);

    // 6. 测试删除渠道
    await testDeleteChannel(accessToken, testChannelId);

    // 7. 验证删除后渠道不可查询
    await verifyChannelDeleted(accessToken, testChannelId);

    // 8. 验证渠道不在项目列表中
    await verifyChannelNotInList(
      accessToken,
      testProjectId,
      testChannelId
    );

    // 9. 测试删除不存在的渠道
    await testDeleteNonExistentChannel(accessToken);

    logger.info('所有测试通过！');
  } catch (error) {
    logger.error('测试失败', { error });
    process.exitCode = 1;
  } finally {
    // 清理测试数据（渠道已被删除）
    if (testProjectId && accessToken) {
      try {
        await deleteTestProject(accessToken, testProjectId);
      } catch (cleanupError) {
        logger.warn('清理测试项目失败', { error: cleanupError });
      }
    }

    if (testOrgId && accessToken) {
      try {
        await deleteTestOrganization(accessToken, testOrgId);
      } catch (cleanupError) {
        logger.warn('清理测试组织失败', { error: cleanupError });
      }
    }
  }
}

// 运行测试
main();
