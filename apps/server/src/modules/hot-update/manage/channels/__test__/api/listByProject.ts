/**
 * 渠道列表（按项目）API 测试
 *
 * 测试流程：
 * 1. 使用已初始化的系统管理员登录获取 Token
 * 2. 创建测试组织和项目
 * 3. 在项目下创建多个测试渠道
 * 4. 调用 listByProject 获取项目下的渠道列表
 * 5. 验证返回结果包含创建的渠道
 * 6. 通过 API 清理测试数据
 *
 * 运行: bun run src/modules/hot-update/channels/__test__/api/listByProject.ts
 */

import { env } from '@/common/env';
import { createClient, type Client } from '@client/index';
import { createLogger } from '@rapid-s/logger';

// ========== Logger 实例 ==========
const logger = createLogger({
  namespace: 'Test:ChannelListByProject',
});

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
  description: '用于渠道列表测试的组织',
};

// 测试项目
const TEST_PROJECT = {
  name: `测试项目_${Date.now()}`,
  slug: `test-project-${Date.now()}`,
  description: '用于渠道列表测试的项目',
};

// 测试渠道列表
const TEST_CHANNELS = [
  { name: 'production', description: '生产环境' },
  { name: 'staging', description: '预发布环境' },
  { name: 'development', description: '开发环境' },
];

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
async function createTestChannels(
  accessToken: string,
  projectId: string
) {
  logger.info('创建测试渠道...');

  const authedClient = createClient(API_URL, { token: accessToken });
  const channelsApi = getChannelsApi(authedClient);

  const createdChannels = [];
  for (const channel of TEST_CHANNELS) {
    const newChannel = await channelsApi.create.mutate({
      projectId,
      name: channel.name,
      description: channel.description,
    });
    createdChannels.push(newChannel);
    logger.info('测试渠道创建成功', {
      id: newChannel.id,
      name: newChannel.name,
    });
  }

  return createdChannels;
}

/** 测试获取项目下的渠道列表 */
async function testListByProject(
  accessToken: string,
  projectId: string,
  expectedChannelIds: string[]
) {
  logger.info('测试获取项目下的渠道列表...', { projectId });

  const authedClient = createClient(API_URL, { token: accessToken });
  const channelsApi = getChannelsApi(authedClient);

  const channels = await channelsApi.listByProject.query({
    projectId,
  });

  logger.info('获取渠道列表成功', {
    count: channels.length,
    channels: channels.map(c => ({
      id: c.id,
      name: c.name,
      channelKey: c.channelKey,
    })),
  });

  // 验证返回结果包含所有创建的渠道
  for (const expectedId of expectedChannelIds) {
    const foundChannel = channels.find(c => c.id === expectedId);
    if (!foundChannel) {
      throw new Error(`渠道列表中未找到渠道 ${expectedId}`);
    }
  }

  logger.info('验证成功：渠道列表包含所有创建的渠道');

  return channels;
}

/** 测试获取空项目的渠道列表 */
async function testListEmptyProject(
  accessToken: string,
  orgId: string
) {
  logger.info('测试获取空项目的渠道列表...');

  const authedClient = createClient(API_URL, { token: accessToken });
  const projectsApi = getProjectsApi(authedClient);
  const channelsApi = getChannelsApi(authedClient);

  // 创建一个新的空项目
  const emptyProject = await projectsApi.create.mutate({
    organizationId: orgId,
    name: `空项目_${Date.now()}`,
    slug: `empty-project-${Date.now()}`,
    description: '用于测试空列表的项目',
  });

  try {
    const channels = await channelsApi.listByProject.query({
      projectId: emptyProject.id,
    });

    if (channels.length !== 0) {
      throw new Error('空项目应该返回空渠道列表');
    }

    logger.info('验证成功：空项目返回空渠道列表');
  } finally {
    // 清理空项目
    await projectsApi.delete.mutate({ id: emptyProject.id });
  }
}

/** 删除测试渠道 */
async function deleteTestChannels(
  accessToken: string,
  channelIds: string[]
) {
  logger.info('删除测试渠道...');

  const authedClient = createClient(API_URL, { token: accessToken });
  const channelsApi = getChannelsApi(authedClient);

  for (const channelId of channelIds) {
    await channelsApi.delete.mutate({ id: channelId });
    logger.info('渠道删除成功', { channelId });
  }
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
  logger.info('开始 listByProject API 测试', { apiUrl: API_URL });

  const client = createClient(API_URL);
  let testOrgId: string | undefined;
  let testProjectId: string | undefined;
  let testChannelIds: string[] = [];
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
    const testChannels = await createTestChannels(
      accessToken,
      testProjectId
    );
    testChannelIds = testChannels.map(c => c.id);

    // 5. 测试获取项目下的渠道列表
    await testListByProject(
      accessToken,
      testProjectId,
      testChannelIds
    );

    // 6. 测试获取空项目的渠道列表
    await testListEmptyProject(accessToken, testOrgId);

    logger.info('所有测试通过！');
  } catch (error) {
    logger.error('测试失败', { error });
    process.exitCode = 1;
  } finally {
    // 清理测试数据
    if (testChannelIds.length > 0 && accessToken) {
      try {
        await deleteTestChannels(accessToken, testChannelIds);
      } catch (cleanupError) {
        logger.warn('清理测试渠道失败', { error: cleanupError });
      }
    }

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
