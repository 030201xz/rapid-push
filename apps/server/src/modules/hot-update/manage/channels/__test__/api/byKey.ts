/**
 * 渠道详情（根据 channelKey）API 测试
 *
 * 测试流程：
 * 1. 使用已初始化的系统管理员登录获取 Token
 * 2. 创建测试组织、项目和渠道
 * 3. 调用 byKey 根据 channelKey 获取渠道详情
 * 4. 验证返回结果正确
 * 5. 测试查询不存在的渠道
 * 6. 通过 API 清理测试数据
 *
 * 运行: bun run src/modules/hot-update/channels/__test__/api/byKey.ts
 */

import { env } from '@/common/env';
import { createClient, type Client } from '@client/index';
import { createLogger } from '@rapid-s/logger';

// ========== Logger 实例 ==========
const logger = createLogger({ namespace: 'Test:ChannelByKey' });

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
  description: '用于渠道 byKey 测试的组织',
};

// 测试项目
const TEST_PROJECT = {
  name: `测试项目_${Date.now()}`,
  slug: `test-project-${Date.now()}`,
  description: '用于渠道 byKey 测试的项目',
};

// 测试渠道
const TEST_CHANNEL = {
  name: 'production',
  description: '用于 byKey 测试的渠道',
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
    channelKey: newChannel.channelKey,
  });

  return newChannel;
}

/** 测试根据 channelKey 获取渠道详情 */
async function testGetChannelByKey(
  accessToken: string,
  channelKey: string,
  expectedChannelId: string
) {
  logger.info('测试根据 channelKey 获取渠道详情...', { channelKey });

  const authedClient = createClient(API_URL, { token: accessToken });
  const channelsApi = getChannelsApi(authedClient);

  const channel = await channelsApi.byKey.query({ channelKey });

  if (!channel) {
    throw new Error(`渠道 ${channelKey} 不存在`);
  }

  // 验证返回数据正确
  if (channel.id !== expectedChannelId) {
    throw new Error(
      `返回的渠道 ID 不匹配: ${channel.id} !== ${expectedChannelId}`
    );
  }

  if (channel.channelKey !== channelKey) {
    throw new Error(`返回的 channelKey 不匹配`);
  }

  if (channel.name !== TEST_CHANNEL.name) {
    throw new Error(`返回的渠道名称不匹配`);
  }

  logger.info('渠道详情获取成功', {
    id: channel.id,
    name: channel.name,
    channelKey: channel.channelKey,
    projectId: channel.projectId,
  });

  return channel;
}

/** 测试查询不存在的渠道（通过 channelKey） */
async function testGetNonExistentChannelByKey(accessToken: string) {
  logger.info('测试查询不存在的渠道（通过 channelKey）...');

  const authedClient = createClient(API_URL, { token: accessToken });
  const channelsApi = getChannelsApi(authedClient);

  // 使用一个随机不存在的 channelKey
  const nonExistentKey = `non-existent-key-${Date.now()}-${Math.random()}`;
  const channel = await channelsApi.byKey.query({
    channelKey: nonExistentKey,
  });

  if (channel !== null) {
    throw new Error('查询不存在的渠道应该返回 null');
  }

  logger.info('验证成功：查询不存在的渠道返回 null');
}

/** 删除测试渠道 */
async function deleteTestChannel(
  accessToken: string,
  channelId: string
) {
  logger.info('删除测试渠道...', { channelId });

  const authedClient = createClient(API_URL, { token: accessToken });
  const channelsApi = getChannelsApi(authedClient);

  await channelsApi.delete.mutate({ id: channelId });

  logger.info('渠道删除成功', { channelId });
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
  logger.info('开始 byKey API 测试', { apiUrl: API_URL });

  const client = createClient(API_URL);
  let testOrgId: string | undefined;
  let testProjectId: string | undefined;
  let testChannelId: string | undefined;
  let testChannelKey: string | undefined;
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
    testChannelId = testChannel.id;
    testChannelKey = testChannel.channelKey;

    // 5. 测试根据 channelKey 获取渠道详情
    await testGetChannelByKey(
      accessToken,
      testChannelKey,
      testChannelId
    );

    // 6. 测试查询不存在的渠道
    await testGetNonExistentChannelByKey(accessToken);

    logger.info('所有测试通过！');
  } catch (error) {
    logger.error('测试失败', { error });
    process.exitCode = 1;
  } finally {
    // 清理测试数据
    if (testChannelId && accessToken) {
      try {
        await deleteTestChannel(accessToken, testChannelId);
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
