/**
 * 渠道禁用代码签名 API 测试
 *
 * 测试流程：
 * 1. 使用已初始化的系统管理员登录获取 Token
 * 2. 创建测试组织、项目和渠道
 * 3. 先设置签名密钥启用签名
 * 4. 调用 disableSigning 禁用签名
 * 5. 验证签名已禁用
 * 6. 验证禁用后无法获取公钥
 * 7. 清理测试数据
 *
 * 运行: bun run src/modules/hot-update/channels/__test__/api/disableSigning.ts
 */

import { env } from '@/common/env';
import { createClient, type Client } from '@client/index';
import { createLogger } from '@rapid-s/logger';

// ========== Logger 实例 ==========
const logger = createLogger({
  namespace: 'Test:ChannelDisableSigning',
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
  description: '用于渠道 disableSigning 测试的组织',
};

// 测试项目
const TEST_PROJECT = {
  name: `测试项目_${Date.now()}`,
  slug: `test-project-${Date.now()}`,
  description: '用于渠道 disableSigning 测试的项目',
};

// 测试渠道
const TEST_CHANNEL = {
  name: 'production',
  description: '用于 disableSigning 测试的渠道',
};

// 测试签名密钥
const TEST_SIGNING_KEYS = {
  publicKey: `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA0Z3VS5JJcds3xfn/ygWyRQ0JEcKwY7Zj
OT0kS8bLrHpT0L3lJYxSGVYdQK8oMsJ9Z8/2TfmUYcl5qA5Kq6JNZJ7hf3gy8T8dU3H0Z3Js4J9T
P7K8Xdy3W0H8xK9J0dS8J9T7K8dX0yT3W0H8xK9J0dS8J9T7K8dX0yT3W0H8xK9J0dS8J9T7K8dX
0yT3W0H8xK9J0dS8J9T7K8dX0yT3W0H8xK9J0dS8J9T7K8dX0yT3W0H8xK9J0dS8J9T7K8dX0yT3
W0H8xK9J0dS8J9T7K8dX0yT3W0H8xK9J0dS8J9T7K8dX0yT3W0H8xK9J0dS8J9T7K8dX0yT3W0H8
xK9J0dS8J9QIDAQAB
-----END PUBLIC KEY-----`,
  privateKey: `-----BEGIN PRIVATE KEY-----
MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQDRndVLkklx2zfF+f/KBbJFDQkR
wrBjtmM5PSRLxsuselnQveUljFIZVh1ArygywnlnT/ZN+ZRhyXmoD0qrok1knuF/eDLxPx1TcfRn
cmzgn1M/srxd3LdbQfzEr0nR1Lwn1PsrxdfTJPdbQfzEr0nR1Lwn1Psrx1fTJPdbQfzEr0nR1Lwn
1Psrx1fTJPdbQfzEr0nR1Lwn1Psrx1fTJPdbQfzEr0nR1Lwn1Psrx1fTJPdbQfzEr0nR1Lwn1Psr
x1fTJPdbQfzEr0nR1Lwn1Psrx1fTJPdbQfzEr0nR1Lwn1Psrx1fTJPdbQfzEr0nR1AgMBAAECggEA
TestPrivateKeyContentHereForDemoOnly0000000000000000000000000000000000000000000
-----END PRIVATE KEY-----`,
};

// ========== 路由别名 ==========

const getAuthApi = (client: Client) => client.core.identify.auth;
const getOrganizationsApi = (client: Client) =>
  client.hotUpdate.organizations;
const getProjectsApi = (client: Client) => client.hotUpdate.projects;
const getChannelsApi = (client: Client) => client.hotUpdate.channels;

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

/** 设置签名密钥（启用签名） */
async function enableSigning(accessToken: string, channelId: string) {
  logger.info('设置签名密钥（启用签名）...', { channelId });

  const authedClient = createClient(API_URL, { token: accessToken });
  const channelsApi = getChannelsApi(authedClient);

  const result = await channelsApi.setSigningKeys.mutate({
    id: channelId,
    publicKey: TEST_SIGNING_KEYS.publicKey,
    privateKey: TEST_SIGNING_KEYS.privateKey,
  });

  if (!result || result.signingEnabled !== true) {
    throw new Error('启用签名失败');
  }

  logger.info('签名已启用', {
    signingEnabled: result.signingEnabled,
  });

  return result;
}

/** 验证签名已启用 */
async function verifySigningEnabled(
  accessToken: string,
  channelId: string
) {
  logger.info('验证签名已启用...', { channelId });

  const authedClient = createClient(API_URL, { token: accessToken });
  const channelsApi = getChannelsApi(authedClient);

  const channel = await channelsApi.byId.query({ id: channelId });

  if (!channel) {
    throw new Error('渠道不存在');
  }

  if (channel.signingEnabled !== true) {
    throw new Error('签名应该已启用');
  }

  logger.info('验证成功：签名已启用');
  return channel;
}

/** 测试禁用签名 */
async function testDisableSigning(
  accessToken: string,
  channelId: string
) {
  logger.info('测试禁用签名...', { channelId });

  const authedClient = createClient(API_URL, { token: accessToken });
  const channelsApi = getChannelsApi(authedClient);

  const result = await channelsApi.disableSigning.mutate({
    id: channelId,
  });

  // 验证返回结果
  if (!result) {
    throw new Error('禁用签名失败：未返回结果');
  }

  if (result.signingEnabled !== false) {
    throw new Error('禁用签名后，signingEnabled 应该为 false');
  }

  logger.info('签名禁用成功', {
    channelId: result.id,
    signingEnabled: result.signingEnabled,
  });

  return result;
}

/** 验证签名已禁用 */
async function verifySigningDisabled(
  accessToken: string,
  channelId: string
) {
  logger.info('验证签名已禁用...', { channelId });

  const authedClient = createClient(API_URL, { token: accessToken });
  const channelsApi = getChannelsApi(authedClient);

  const channel = await channelsApi.byId.query({ id: channelId });

  if (!channel) {
    throw new Error('渠道不存在');
  }

  if (channel.signingEnabled !== false) {
    throw new Error('签名应该已禁用');
  }

  logger.info('验证成功：签名已禁用');
  return channel;
}

/** 测试禁用后无法获取公钥 */
async function testCannotGetPublicKeyAfterDisable(
  accessToken: string,
  channelId: string
) {
  logger.info('测试禁用后无法获取公钥...', { channelId });

  const authedClient = createClient(API_URL, { token: accessToken });
  const channelsApi = getChannelsApi(authedClient);

  const publicKey = await channelsApi.getPublicKey.query({
    id: channelId,
  });

  // 禁用签名后，公钥应该为空或返回 null
  if (publicKey) {
    throw new Error('禁用签名后不应该能获取公钥');
  }

  logger.info('验证成功：禁用后无法获取公钥');
}

/** 测试对未启用签名的渠道禁用签名 */
async function testDisableSigningOnUnsignedChannel(
  accessToken: string,
  projectId: string
) {
  logger.info('测试对未启用签名的渠道禁用签名...');

  const authedClient = createClient(API_URL, { token: accessToken });
  const channelsApi = getChannelsApi(authedClient);

  // 创建一个新渠道（不启用签名）
  const newChannel = await channelsApi.create.mutate({
    projectId,
    name: `test-unsigned-${Date.now()}`,
    description: '测试未启用签名的渠道',
  });

  const newChannelId = newChannel.id;

  try {
    // 尝试禁用签名（渠道本身没有启用签名）
    const result = await channelsApi.disableSigning.mutate({
      id: newChannelId,
    });

    // 应该成功执行，signingEnabled 保持 false
    if (!result || result.signingEnabled !== false) {
      throw new Error('未启用签名的渠道禁用后应该仍为 false');
    }

    logger.info('验证成功：未启用签名的渠道可以正常调用禁用签名');
  } finally {
    // 清理测试渠道
    await channelsApi.delete.mutate({ id: newChannelId });
    logger.info('清理临时测试渠道', { channelId: newChannelId });
  }
}

/** 测试重新启用签名 */
async function testReEnableSigning(
  accessToken: string,
  channelId: string
) {
  logger.info('测试重新启用签名...', { channelId });

  // 禁用后重新设置签名密钥
  const result = await enableSigning(accessToken, channelId);

  if (result.signingEnabled !== true) {
    throw new Error('重新启用签名失败');
  }

  logger.info('验证成功：重新启用签名成功');

  return result;
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
  logger.info('开始 disableSigning API 测试', { apiUrl: API_URL });

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

    // 5. 设置签名密钥（启用签名）
    await enableSigning(accessToken, testChannelId);

    // 6. 验证签名已启用
    await verifySigningEnabled(accessToken, testChannelId);

    // 7. 测试禁用签名
    await testDisableSigning(accessToken, testChannelId);

    // 8. 验证签名已禁用
    await verifySigningDisabled(accessToken, testChannelId);

    // 9. 测试禁用后无法获取公钥
    await testCannotGetPublicKeyAfterDisable(
      accessToken,
      testChannelId
    );

    // 10. 测试对未启用签名的渠道禁用签名
    await testDisableSigningOnUnsignedChannel(
      accessToken,
      testProjectId
    );

    // 11. 测试重新启用签名
    await testReEnableSigning(accessToken, testChannelId);

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
