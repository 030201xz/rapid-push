/**
 * 渠道创建 API 测试
 *
 * 测试流程：
 * 1. 使用已初始化的系统管理员登录获取 Token
 * 2. 创建测试组织和项目（渠道需要所属项目）
 * 3. 使用管理员 Token 调用 create channel API
 * 4. 验证创建成功
 * 5. 通过 API 清理测试数据
 *
 * 运行: bun run src/modules/hot-update/channels/__test__/api/create.ts
 */

import { env } from '@/common/env';
import { createClient, type Client } from '@client/index';
import { createLogger } from '@rapid-s/logger';

// ========== Logger 实例 ==========
const logger = createLogger({ namespace: 'Test:ChannelCreate' });

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
  description: '用于渠道测试的组织',
};

// 测试项目
const TEST_PROJECT = {
  name: `测试项目_${Date.now()}`,
  slug: `test-project-${Date.now()}`,
  description: '用于渠道测试的项目',
};

// 待创建的测试渠道
const NEW_CHANNEL = {
  name: 'production',
  description: '生产环境渠道',
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

/** 测试创建渠道 */
async function testCreateChannel(
  accessToken: string,
  projectId: string
) {
  logger.info('测试创建渠道...');

  const authedClient = createClient(API_URL, { token: accessToken });
  const channelsApi = getChannelsApi(authedClient);

  const newChannel = await channelsApi.create.mutate({
    projectId,
    name: NEW_CHANNEL.name,
    description: NEW_CHANNEL.description,
  });

  // 验证返回数据
  if (!newChannel.channelKey) {
    throw new Error('渠道创建失败: channelKey 不存在');
  }

  logger.info('渠道创建成功', {
    id: newChannel.id,
    name: newChannel.name,
    channelKey: newChannel.channelKey,
    projectId: newChannel.projectId,
    signingEnabled: newChannel.signingEnabled,
  });

  return newChannel;
}

/** 测试查询渠道（验证创建结果） */
async function testGetChannel(
  accessToken: string,
  channelId: string
) {
  logger.info('测试查询渠道...', { channelId });

  const authedClient = createClient(API_URL, { token: accessToken });
  const channelsApi = getChannelsApi(authedClient);

  const channel = await channelsApi.byId.query({ id: channelId });

  if (!channel) {
    throw new Error(`渠道 ${channelId} 不存在`);
  }

  logger.info('渠道查询成功', {
    id: channel.id,
    name: channel.name,
    channelKey: channel.channelKey,
  });

  return channel;
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
  logger.info('开始渠道创建 API 测试', { apiUrl: API_URL });

  const client = createClient(API_URL);
  let testOrgId: string | undefined;
  let testProjectId: string | undefined;
  let newChannelId: string | undefined;
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

    // 4. 创建新渠道
    const newChannel = await testCreateChannel(
      accessToken,
      testProjectId
    );
    newChannelId = newChannel.id;

    // 5. 查询创建的渠道（验证创建成功）
    await testGetChannel(accessToken, newChannelId);

    logger.info('所有测试通过！');
  } catch (error) {
    logger.error('测试失败', { error });
    process.exitCode = 1;
  } finally {
    // 清理测试数据：按依赖顺序删除
    if (newChannelId && accessToken) {
      try {
        await deleteTestChannel(accessToken, newChannelId);
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
