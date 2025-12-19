/**
 * 渠道更新 API 测试
 *
 * 测试流程：
 * 1. 使用已初始化的系统管理员登录获取 Token
 * 2. 创建测试组织、项目和渠道
 * 3. 调用 update 更新渠道信息
 * 4. 验证更新结果正确
 * 5. 测试部分更新
 * 6. 测试更新不存在的渠道
 * 7. 通过 API 清理测试数据
 *
 * 运行: bun run src/modules/hot-update/channels/__test__/api/update.ts
 */

import { env } from '@/common/env';
import { createClient, type Client } from '@client/index';
import { createLogger } from '@rapid-s/logger';

// ========== Logger 实例 ==========
const logger = createLogger({ namespace: 'Test:ChannelUpdate' });

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
  description: '用于渠道 update 测试的组织',
};

// 测试项目
const TEST_PROJECT = {
  name: `测试项目_${Date.now()}`,
  slug: `test-project-${Date.now()}`,
  description: '用于渠道 update 测试的项目',
};

// 测试渠道
const TEST_CHANNEL = {
  name: 'production',
  description: '用于 update 测试的渠道',
};

// 更新后的数据
const UPDATED_CHANNEL = {
  name: 'staging',
  description: '更新后的渠道描述',
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

/** 测试更新渠道信息 */
async function testUpdateChannel(
  accessToken: string,
  channelId: string,
  originalChannelKey: string
) {
  logger.info('测试更新渠道信息...', { channelId });

  const authedClient = createClient(API_URL, { token: accessToken });
  const channelsApi = getChannelsApi(authedClient);

  const updatedChannel = await channelsApi.update.mutate({
    id: channelId,
    name: UPDATED_CHANNEL.name,
    description: UPDATED_CHANNEL.description,
  });

  if (!updatedChannel) {
    throw new Error(`更新渠道失败: 返回 null`);
  }

  // 验证更新结果
  if (updatedChannel.name !== UPDATED_CHANNEL.name) {
    throw new Error(
      `渠道名称更新失败: ${updatedChannel.name} !== ${UPDATED_CHANNEL.name}`
    );
  }

  if (updatedChannel.description !== UPDATED_CHANNEL.description) {
    throw new Error(`渠道描述更新失败`);
  }

  // channelKey 不应该改变
  if (updatedChannel.channelKey !== originalChannelKey) {
    throw new Error(`渠道 channelKey 不应该被修改`);
  }

  logger.info('渠道更新成功', {
    id: updatedChannel.id,
    name: updatedChannel.name,
    channelKey: updatedChannel.channelKey,
    description: updatedChannel.description,
    updatedAt: updatedChannel.updatedAt,
  });

  return updatedChannel;
}

/** 测试部分更新（只更新描述） */
async function testPartialUpdate(
  accessToken: string,
  channelId: string
) {
  logger.info('测试部分更新渠道信息...');

  const authedClient = createClient(API_URL, { token: accessToken });
  const channelsApi = getChannelsApi(authedClient);

  const partialUpdateDescription = `部分更新描述_${Date.now()}`;
  const updatedChannel = await channelsApi.update.mutate({
    id: channelId,
    description: partialUpdateDescription,
  });

  if (!updatedChannel) {
    throw new Error(`部分更新失败: 返回 null`);
  }

  // 验证描述已更新
  if (updatedChannel.description !== partialUpdateDescription) {
    throw new Error(`部分更新描述失败`);
  }

  // 验证名称保持不变（应该是上次更新后的值）
  if (updatedChannel.name !== UPDATED_CHANNEL.name) {
    throw new Error(`部分更新时名称被意外修改`);
  }

  logger.info('部分更新成功', {
    id: updatedChannel.id,
    name: updatedChannel.name,
    description: updatedChannel.description,
  });

  return updatedChannel;
}

/** 测试更新不存在的渠道 */
async function testUpdateNonExistentChannel(accessToken: string) {
  logger.info('测试更新不存在的渠道...');

  const authedClient = createClient(API_URL, { token: accessToken });
  const channelsApi = getChannelsApi(authedClient);

  // 使用一个随机 UUID
  const nonExistentId = '00000000-0000-0000-0000-000000000000';
  const result = await channelsApi.update.mutate({
    id: nonExistentId,
    name: '测试更新不存在的渠道',
  });

  if (result !== null) {
    throw new Error('更新不存在的渠道应该返回 null');
  }

  logger.info('验证成功：更新不存在的渠道返回 null');
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
  logger.info('开始 update API 测试', { apiUrl: API_URL });

  const client = createClient(API_URL);
  let testOrgId: string | undefined;
  let testProjectId: string | undefined;
  let testChannelId: string | undefined;
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

    // 5. 测试更新渠道信息
    await testUpdateChannel(
      accessToken,
      testChannelId,
      testChannel.channelKey
    );

    // 6. 测试部分更新
    await testPartialUpdate(accessToken, testChannelId);

    // 7. 测试更新不存在的渠道
    await testUpdateNonExistentChannel(accessToken);

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
