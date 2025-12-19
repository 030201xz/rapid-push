/**
 * 渠道密钥重新生成 API 测试
 *
 * 测试流程：
 * 1. 使用已初始化的系统管理员登录获取 Token
 * 2. 创建测试组织、项目和渠道
 * 3. 记录原始 channelKey
 * 4. 调用 regenerateKey 重新生成密钥
 * 5. 验证新密钥与原密钥不同
 * 6. 验证可以使用新密钥查询渠道
 * 7. 清理测试数据
 *
 * 运行: bun run src/modules/hot-update/channels/__test__/api/regenerateKey.ts
 */

import { env } from '@/common/env';
import { createClient, type Client } from '@client/index';
import { createLogger } from '@rapid-s/logger';

// ========== Logger 实例 ==========
const logger = createLogger({
  namespace: 'Test:ChannelRegenerateKey',
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
  description: '用于渠道 regenerateKey 测试的组织',
};

// 测试项目
const TEST_PROJECT = {
  name: `测试项目_${Date.now()}`,
  slug: `test-project-${Date.now()}`,
  description: '用于渠道 regenerateKey 测试的项目',
};

// 测试渠道
const TEST_CHANNEL = {
  name: 'production',
  description: '用于 regenerateKey 测试的渠道',
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

/** 测试重新生成密钥 */
async function testRegenerateKey(
  accessToken: string,
  channelId: string,
  originalKey: string
) {
  logger.info('测试重新生成渠道密钥...', { channelId, originalKey });

  const authedClient = createClient(API_URL, { token: accessToken });
  const channelsApi = getChannelsApi(authedClient);

  const result = await channelsApi.regenerateKey.mutate({
    id: channelId,
  });

  // 验证返回了新的渠道信息
  if (!result || !result.channelKey) {
    throw new Error('重新生成密钥失败：未返回新密钥');
  }

  // 验证新密钥与原密钥不同
  if (result.channelKey === originalKey) {
    throw new Error('重新生成密钥失败：新密钥与原密钥相同');
  }

  logger.info('密钥重新生成成功', {
    originalKey,
    newKey: result.channelKey,
  });

  return result;
}

/** 测试使用新密钥查询渠道 */
async function testQueryByNewKey(
  accessToken: string,
  newChannelKey: string,
  channelId: string
) {
  logger.info('测试使用新密钥查询渠道...', { newChannelKey });

  const authedClient = createClient(API_URL, { token: accessToken });
  const channelsApi = getChannelsApi(authedClient);

  const channel = await channelsApi.byKey.query({
    channelKey: newChannelKey,
  });

  if (!channel) {
    throw new Error('使用新密钥查询渠道失败：渠道不存在');
  }

  if (channel.id !== channelId) {
    throw new Error('使用新密钥查询渠道失败：返回的渠道ID不匹配');
  }

  logger.info('使用新密钥查询成功', {
    channelId: channel.id,
    channelKey: channel.channelKey,
  });

  return channel;
}

/** 测试原密钥已失效 */
async function testOriginalKeyInvalid(
  accessToken: string,
  originalKey: string
) {
  logger.info('测试原密钥已失效...', { originalKey });

  const authedClient = createClient(API_URL, { token: accessToken });
  const channelsApi = getChannelsApi(authedClient);

  const channel = await channelsApi.byKey.query({
    channelKey: originalKey,
  });

  // 原密钥应该查询不到渠道
  if (channel !== null) {
    throw new Error('原密钥应该已失效，但仍能查询到渠道');
  }

  logger.info('验证成功：原密钥已失效');
}

/** 多次重新生成密钥 */
async function testMultipleRegenerate(
  accessToken: string,
  channelId: string
) {
  logger.info('测试多次重新生成密钥...');

  const authedClient = createClient(API_URL, { token: accessToken });
  const channelsApi = getChannelsApi(authedClient);

  const keys: string[] = [];

  // 连续重新生成 3 次
  for (let i = 0; i < 3; i++) {
    const result = await channelsApi.regenerateKey.mutate({
      id: channelId,
    });

    if (!result || !result.channelKey) {
      throw new Error(`第 ${i + 1} 次重新生成密钥失败`);
    }

    // 验证每次生成的密钥都不同
    if (keys.includes(result.channelKey)) {
      throw new Error(`第 ${i + 1} 次生成的密钥与之前重复`);
    }

    keys.push(result.channelKey);
    logger.info(`第 ${i + 1} 次重新生成成功`, {
      newKey: result.channelKey,
    });
  }

  logger.info('多次重新生成密钥测试通过', { totalKeys: keys.length });

  return keys[keys.length - 1]!;
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
  logger.info('开始 regenerateKey API 测试', { apiUrl: API_URL });

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
    const originalKey = testChannel.channelKey;

    // 5. 测试重新生成密钥
    const regeneratedChannel = await testRegenerateKey(
      accessToken,
      testChannelId,
      originalKey
    );

    // 6. 测试使用新密钥查询
    await testQueryByNewKey(
      accessToken,
      regeneratedChannel.channelKey,
      testChannelId
    );

    // 7. 测试原密钥已失效
    await testOriginalKeyInvalid(accessToken, originalKey);

    // 8. 测试多次重新生成密钥
    await testMultipleRegenerate(accessToken, testChannelId);

    logger.info('所有测试通过！');
  } catch (error) {
    logger.error('测试失败', { error });
    process.exitCode = 1;
  } finally {
    // 清理测试数据（按依赖顺序逆序删除）
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
